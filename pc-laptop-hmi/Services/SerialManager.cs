using System.Diagnostics;
using System.IO;
using System.IO.Ports;
using System.Management;
using System.Text;
using Ntu1200Hmi.Models;

namespace Ntu1200Hmi.Services;

public class SerialManager
{
    private const int BaudRate = 9600;
    public int PollIntervalMs { get; set; } = 500; // >= 500ms 明緯原廠輪詢規範 (可動態調整 500, 1000, 2000)
    public int ReadTimeoutMs { get; set; } = 200;  // 典型回應逾時
    private const double StaleThresholdSec = 1.5;

    private SerialPort? _serialPort;
    private Thread? _workerThread;
    private bool _isRunning = false;
    private readonly object _lock = new();

    public event Action<NtuTelemetry>? OnTelemetryReceived;
    public event Action<string, bool, bool>? OnStatusChanged; // statusText, isConnected, isStale
    public event Action<string>? OnTxPacket;
    public event Action<string>? OnRxPacket;

    public string CurrentTargetPort { get; private set; } = "AUTO";
    public string ActivePortName { get; private set; } = "未連接";
    public bool IsConnected { get; private set; } = false;
    public bool IsStale { get; private set; } = false;

    private DateTime _lastReceivedTime = DateTime.MinValue;
    private int _mockStep = 0;
    private readonly string _logDir;
    public string LogDirectory => _logDir;

    public SerialManager()
    {
        _logDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
        Directory.CreateDirectory(_logDir);
    }

    public void OpenLogFolder()
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = _logDir,
                UseShellExecute = true
            });
        }
        catch { }
    }

    public List<PortInfo> GetAvailablePorts()
    {
        var list = new List<PortInfo>();

        try
        {
            var rawPorts = SerialPort.GetPortNames().Distinct().OrderBy(p => p).ToList();
            var portDescriptions = QueryWmiPortDescriptions();

            // 1. 先加入實體偵測到的硬體串口
            foreach (var p in rawPorts)
            {
                var desc = portDescriptions.TryGetValue(p, out var d) ? d : "通用序列埠";
                var chipType = IdentifyChip(desc);
                list.Add(new PortInfo
                {
                    PortName = p,
                    Description = desc,
                    ChipType = chipType
                });
            }
        }
        catch
        {
            foreach (var p in SerialPort.GetPortNames().Distinct())
            {
                list.Add(new PortInfo { PortName = p, Description = "標準序列埠", ChipType = "通用" });
            }
        }

        // 2. 加入智慧自動探測與模擬示範模式
        list.Add(new PortInfo { PortName = "AUTO", Description = "智慧自動探測鎖定 (自動掃描所有串口)", ChipType = "自動" });
        list.Add(new PortInfo { PortName = "MOCK", Description = "離線模擬示範模式 (無硬體展示)", ChipType = "虛擬" });

        return list;
    }

    private static Dictionary<string, string> QueryWmiPortDescriptions()
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT Caption, DeviceID, PNPDeviceID FROM Win32_PnPEntity WHERE Caption LIKE '%(COM%'");
            foreach (var obj in searcher.Get())
            {
                var caption = obj["Caption"]?.ToString() ?? "";
                var pnpId = obj["PNPDeviceID"]?.ToString() ?? "";

                // 解析出 (COM3)
                var start = caption.LastIndexOf("(COM", StringComparison.OrdinalIgnoreCase);
                if (start >= 0)
                {
                    var end = caption.IndexOf(')', start);
                    if (end > start)
                    {
                        var comName = caption.Substring(start + 1, end - start - 1).Trim();
                        dict[comName] = $"{caption} [{pnpId}]";
                    }
                }
            }
        }
        catch { }
        return dict;
    }

    private static string IdentifyChip(string desc)
    {
        var upper = desc.ToUpperInvariant();
        if (upper.Contains("110A") || upper.Contains("UPORT") || upper.Contains("MOXA"))
            return "MOXA 工業級串口 (UPort 1110/1150)";
        if (upper.Contains("0403") || upper.Contains("FT232") || upper.Contains("FTDI"))
            return "FTDI (FT232BL / FT232RL)";
        if (upper.Contains("10C4") || upper.Contains("CP210"))
            return "Silicon Labs (CP2104 / CP2102)";
        if (upper.Contains("1A86") || upper.Contains("CH340") || upper.Contains("CH341"))
            return "沁恆 (CH340 / CH341)";
        if (upper.Contains("067B") || upper.Contains("PL2303") || upper.Contains("UNITEK"))
            return "UNITEK / 旺玖 (PL2303)";
        return "標準 USB 串口";
    }

    public void Connect(string targetPort)
    {
        Disconnect();
        CurrentTargetPort = targetPort;
        _isRunning = true;
        _workerThread = new Thread(WorkerLoop) { IsBackground = true };
        _workerThread.Start();
    }

    public void Disconnect()
    {
        _isRunning = false;
        if (_workerThread != null && _workerThread.IsAlive)
        {
            _workerThread.Join(500);
        }

        lock (_lock)
        {
            try
            {
                _serialPort?.Close();
                _serialPort?.Dispose();
            }
            catch { }
            _serialPort = null;
        }

        IsConnected = false;
        IsStale = false;
        ActivePortName = "未連接";
        OnStatusChanged?.Invoke("已斷開", false, false);
    }

    public (bool success, string message) SendCommand(string command)
    {
        if (!command.EndsWith("\r")) command += "\r";

        OnTxPacket?.Invoke(command.TrimEnd('\r'));

        if (CurrentTargetPort == "MOCK")
        {
            return (true, $"[模擬模式] 指令已模擬執行: {command.Trim()}");
        }

        lock (_lock)
        {
            if (_serialPort == null || !_serialPort.IsOpen)
                return (false, "串列埠尚未建立連線");

            try
            {
                var bytes = Encoding.ASCII.GetBytes(command);
                _serialPort.Write(bytes, 0, bytes.Length);
                return (true, $"成功發送: {command.Trim()}");
            }
            catch (Exception ex)
            {
                return (false, $"發送失敗: {ex.Message}");
            }
        }
    }

    private void WorkerLoop()
    {
        var csvCounter = 0;

        while (_isRunning)
        {
            try
            {
                // 1. 處理離線模擬模式
                if (CurrentTargetPort == "MOCK")
                {
                    IsConnected = true;
                    IsStale = false;
                    ActivePortName = "離線模擬示範器 (Mock Inverter)";
                    OnStatusChanged?.Invoke(ActivePortName, true, false);

                    _mockStep++;
                    var simLoad = 30 + (_mockStep % 20);
                    var simVbat = 12.6 - ((_mockStep % 15) * 0.1);
                    var simTemp = 36.5 + ((_mockStep % 8) * 0.5);
                    var mockPacket = $"(110.0 {simLoad:000} {simLoad:00.0} {simVbat:00.0} {simTemp:00.0} 110.0 060.0 162.0 000 1011000000000000000)\r";

                    var telemetry = NtuTelemetry.Parse(mockPacket, latencyMs: 12);
                    if (telemetry != null)
                    {
                        OnTelemetryReceived?.Invoke(telemetry);
                        OnRxPacket?.Invoke(mockPacket.TrimEnd('\r'));
                    }

                    Thread.Sleep(PollIntervalMs);
                    continue;
                }

                // 2. 實體硬體連線模式
                lock (_lock)
                {
                    if (_serialPort == null || !_serialPort.IsOpen)
                    {
                        if (CurrentTargetPort == "AUTO")
                        {
                            var ports = SerialPort.GetPortNames();
                            if (ports.Length == 0)
                            {
                                OnStatusChanged?.Invoke("未偵測到任何 COM 序列埠 (請檢查 USB 轉接線)", false, false);
                            }
                            else
                            {
                                OnStatusChanged?.Invoke($"自動探測中: 正在掃描 ({string.Join(", ", ports)})...", false, false);
                                SerialPort? foundPort = null;
                                foreach (var p in ports)
                                {
                                    var testPort = ProbePort(p);
                                    if (testPort != null)
                                    {
                                        foundPort = testPort;
                                        ActivePortName = $"自動鎖定: {p}";
                                        break;
                                    }
                                }

                                if (foundPort != null)
                                {
                                    _serialPort = foundPort;
                                    IsConnected = true;
                                    OnStatusChanged?.Invoke(ActivePortName, true, false);
                                }
                                else
                                {
                                    // 未收到回應時，若有偵測到單一串口或首選串口，直接嘗試開啟監聽
                                    var fallbackPort = ports[0];
                                    try
                                    {
                                        _serialPort = new SerialPort(fallbackPort, BaudRate, Parity.None, 8, StopBits.One)
                                        {
                                            ReadTimeout = ReadTimeoutMs,
                                            WriteTimeout = 200,
                                            DtrEnable = true,
                                            RtsEnable = true
                                        };
                                        _serialPort.Open();
                                        ActivePortName = $"已開啟: {fallbackPort} (等待逆變器數據回應...)";
                                        IsConnected = true;
                                        OnStatusChanged?.Invoke(ActivePortName, true, false);
                                    }
                                    catch (Exception ex)
                                    {
                                        IsConnected = false;
                                        OnStatusChanged?.Invoke($"開啟 {fallbackPort} 失敗: {ex.Message}", false, false);
                                    }
                                }
                            }
                        }
                        else
                        {
                            try
                            {
                                OnStatusChanged?.Invoke($"正在連線至 {CurrentTargetPort}...", false, false);
                                _serialPort = new SerialPort(CurrentTargetPort, BaudRate, Parity.None, 8, StopBits.One)
                                {
                                    ReadTimeout = ReadTimeoutMs,
                                    WriteTimeout = 200,
                                    DtrEnable = true,
                                    RtsEnable = true
                                };
                                _serialPort.Open();
                                ActivePortName = $"已連接: {CurrentTargetPort} (9600-8-N-1)";
                                IsConnected = true;
                                OnStatusChanged?.Invoke(ActivePortName, true, false);
                            }
                            catch (Exception ex)
                            {
                                IsConnected = false;
                                OnStatusChanged?.Invoke($"連接 {CurrentTargetPort} 失敗: {ex.Message}", false, false);
                            }
                        }
                    }
                }

                if (_serialPort == null || !_serialPort.IsOpen)
                {
                    Thread.Sleep(1000);
                    continue;
                }

                // 3. 正常輪詢發送 Q\r
                var sw = Stopwatch.StartNew();
                string response;
                lock (_lock)
                {
                    _serialPort.DiscardInBuffer();
                    var cmdBytes = Encoding.ASCII.GetBytes("Q\r");
                    _serialPort.Write(cmdBytes, 0, cmdBytes.Length);
                    OnTxPacket?.Invoke("Q");

                    response = _serialPort.ReadTo("\r");
                }
                sw.Stop();

                var latency = sw.ElapsedMilliseconds;
                var rawStr = "(" + response.TrimStart('(');
                OnRxPacket?.Invoke(rawStr);

                var data = NtuTelemetry.Parse(rawStr, latency);
                if (data != null)
                {
                    _lastReceivedTime = DateTime.Now;
                    IsStale = false;
                    OnTelemetryReceived?.Invoke(data);

                    csvCounter++;
                    if (csvCounter >= 60) // 每 30 秒自動寫入一筆 CSV
                    {
                        csvCounter = 0;
                        LogToCsv(data);
                    }
                }
                else
                {
                    CheckStaleState();
                }

                Thread.Sleep(PollIntervalMs);
            }
            catch (TimeoutException)
            {
                CheckStaleState();
                Thread.Sleep(PollIntervalMs);
            }
            catch (Exception ex)
            {
                lock (_lock)
                {
                    try { _serialPort?.Close(); } catch { }
                    _serialPort = null;
                }
                IsConnected = false;
                OnStatusChanged?.Invoke($"通訊中斷 ({ex.Message})，重試中...", false, false);
                Thread.Sleep(1000);
            }
        }
    }

    private void CheckStaleState()
    {
        if (IsConnected && (DateTime.Now - _lastReceivedTime).TotalSeconds > StaleThresholdSec)
        {
            IsStale = true;
            OnStatusChanged?.Invoke("數據逾期 (STALE)", true, true);
        }
    }

    private static SerialPort? ProbePort(string portName)
    {
        try
        {
            var sp = new SerialPort(portName, BaudRate, Parity.None, 8, StopBits.One)
            {
                ReadTimeout = 300,
                WriteTimeout = 300,
                DtrEnable = true,
                RtsEnable = true
            };
            sp.Open();
            sp.DiscardInBuffer();
            var cmd = Encoding.ASCII.GetBytes("Q\r");
            sp.Write(cmd, 0, cmd.Length);
            Thread.Sleep(120);
            var res = sp.ReadExisting();
            if (res.Contains('(') && res.Contains(')'))
            {
                return sp;
            }
            sp.Close();
        }
        catch { }
        return null;
    }

    private void LogToCsv(NtuTelemetry data)
    {
        try
        {
            var today = DateTime.Now.ToString("yyyy-MM-dd");
            var filePath = Path.Combine(_logDir, $"ntu1200_{today}.csv");
            var exists = File.Exists(filePath);

            using var sw = new StreamWriter(filePath, append: true, Encoding.UTF8);
            if (!exists)
            {
                sw.WriteLine("Timestamp,AC_Volt,Load_Pct,Load_Watts,Bat_Volt,Temp,Grid_Volt,Freq,PowerPath,Status");
            }
            sw.WriteLine($"{DateTime.Now:yyyy-MM-dd HH:mm:ss},{data.AcOutputVoltage},{data.LoadPercent},{data.LoadWatts},{data.BatteryVoltage},{data.Temperature},{data.GridInputVoltage},{data.OutputFrequency},{data.PowerPath},{data.BatteryStatus}");
        }
        catch { }
    }
}
