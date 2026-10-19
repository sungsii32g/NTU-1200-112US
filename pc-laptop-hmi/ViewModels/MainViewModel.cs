using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows;
using Ntu1200Hmi.Models;
using Ntu1200Hmi.Services;

namespace Ntu1200Hmi.ViewModels;

public class MainViewModel : INotifyPropertyChanged
{
    private readonly SerialManager _serialManager;

    public ObservableCollection<PortInfo> AvailablePorts { get; } = new();

    private PortInfo? _selectedPort;
    public PortInfo? SelectedPort
    {
        get => _selectedPort;
        set { _selectedPort = value; OnPropertyChanged(); }
    }

    private string _statusText = "未連接";
    public string StatusText
    {
        get => _statusText;
        set { _statusText = value; OnPropertyChanged(); }
    }

    private bool _isConnected = false;
    public bool IsConnected
    {
        get => _isConnected;
        set 
        { 
            _isConnected = value; 
            OnPropertyChanged(); 
            OnPropertyChanged(nameof(ConnectButtonText));
        }
    }

    public string ConnectButtonText => IsConnected ? "斷開連線" : "建立連線";

    private bool _isStale = false;
    public bool IsStale
    {
        get => _isStale;
        set { _isStale = value; OnPropertyChanged(); }
    }

    private long _latencyMs = 0;
    public long LatencyMs
    {
        get => _latencyMs;
        set { _latencyMs = value; OnPropertyChanged(); }
    }

    private string _activeDeviceName = "未連接";
    public string ActiveDeviceName
    {
        get => _activeDeviceName;
        set { _activeDeviceName = value; OnPropertyChanged(); }
    }

    // 電力遙測
    private double _batteryVoltage = 0.0;
    public double BatteryVoltage
    {
        get => _batteryVoltage;
        set { _batteryVoltage = value; OnPropertyChanged(); }
    }

    private double _acOutputVoltage = 0.0;
    public double AcOutputVoltage
    {
        get => _acOutputVoltage;
        set { _acOutputVoltage = value; OnPropertyChanged(); }
    }

    private double _loadWatts = 0.0;
    public double LoadWatts
    {
        get => _loadWatts;
        set { _loadWatts = value; OnPropertyChanged(); }
    }

    private int _loadPercent = 0;
    public int LoadPercent
    {
        get => _loadPercent;
        set { _loadPercent = value; OnPropertyChanged(); }
    }

    private double _temperature = 0.0;
    public double Temperature
    {
        get => _temperature;
        set { _temperature = value; OnPropertyChanged(); }
    }

    private double _gridInputVoltage = 0.0;
    public double GridInputVoltage
    {
        get => _gridInputVoltage;
        set { _gridInputVoltage = value; OnPropertyChanged(); }
    }

    private double _outputFrequency = 0.0;
    public double OutputFrequency
    {
        get => _outputFrequency;
        set { _outputFrequency = value; OnPropertyChanged(); }
    }

    private double _dcBusVoltage = 0.0;
    public double DcBusVoltage
    {
        get => _dcBusVoltage;
        set { _dcBusVoltage = value; OnPropertyChanged(); }
    }

    // 狀態與旗標
    private string _powerPath = "待機中";
    public string PowerPath
    {
        get => _powerPath;
        set { _powerPath = value; OnPropertyChanged(); }
    }

    private string _batteryStatusText = "未知";
    public string BatteryStatusText
    {
        get => _batteryStatusText;
        set { _batteryStatusText = value; OnPropertyChanged(); }
    }

    private bool _inverterActive;
    public bool InverterActive { get => _inverterActive; set { _inverterActive = value; OnPropertyChanged(); } }

    private bool _utilityBypass;
    public bool UtilityBypass { get => _utilityBypass; set { _utilityBypass = value; OnPropertyChanged(); } }

    private bool _gridNormal;
    public bool GridNormal { get => _gridNormal; set { _gridNormal = value; OnPropertyChanged(); } }

    private bool _savingMode;
    public bool SavingMode { get => _savingMode; set { _savingMode = value; OnPropertyChanged(); } }

    private bool _fault;
    public bool Fault { get => _fault; set { _fault = value; OnPropertyChanged(); } }

    private bool _eepromError;
    public bool EepromError { get => _eepromError; set { _eepromError = value; OnPropertyChanged(); } }

    // 介面模式切換 (0: 監控模式, 1: 工程應用模式)
    private int _selectedUiMode = 0;
    public int SelectedUiMode
    {
        get => _selectedUiMode;
        set 
        { 
            _selectedUiMode = value; 
            OnPropertyChanged(); 
            OnPropertyChanged(nameof(IsMonitorMode));
            OnPropertyChanged(nameof(IsEngineeringMode));
        }
    }

    public bool IsMonitorMode => SelectedUiMode == 0;
    public bool IsEngineeringMode => SelectedUiMode == 1;

    // 工程模式屬性
    private bool _isParamUnlocked = false;
    public bool IsParamUnlocked { get => _isParamUnlocked; set { _isParamUnlocked = value; OnPropertyChanged(); } }

    private string _deviceInfoText = "尚未查詢設備資訊";
    public string DeviceInfoText { get => _deviceInfoText; set { _deviceInfoText = value; OnPropertyChanged(); } }

    private string _rawCommandInput = "Q";
    public string RawCommandInput { get => _rawCommandInput; set { _rawCommandInput = value; OnPropertyChanged(); } }

    // 終端機日誌
    private string _txLine = "Q\\r";
    public string TxLine { get => _txLine; set { _txLine = value; OnPropertyChanged(); } }

    private string _rxLine = "尚未接收";
    public string RxLine { get => _rxLine; set { _rxLine = value; OnPropertyChanged(); } }


    // 19-Bit 診斷矩陣
    public ObservableCollection<BitFlagInfo> DiagnosticBits { get; } = new();

    // 電壓與頻率選擇
    private string _selectedVoltage = "110";
    public string SelectedVoltage
    {
        get => _selectedVoltage;
        set { _selectedVoltage = value; OnPropertyChanged(); }
    }

    private string _selectedFreq = "060";
    public string SelectedFreq
    {
        get => _selectedFreq;
        set { _selectedFreq = value; OnPropertyChanged(); }
    }

    public List<string> VoltageOptions { get; } = new() { "110", "120", "115", "100" };
    public List<string> FreqOptions { get; } = new() { "060", "050" };

    // 可自訂之工程警戒門檻 (可介面化即時設定)
    private double _lowBatWarnThreshold = 11.0;
    public double LowBatWarnThreshold { get => _lowBatWarnThreshold; set { _lowBatWarnThreshold = value; OnPropertyChanged(); } }

    private double _lowBatCutoffThreshold = 10.0;
    public double LowBatCutoffThreshold { get => _lowBatCutoffThreshold; set { _lowBatCutoffThreshold = value; OnPropertyChanged(); } }

    private double _highBatWarnThreshold = 15.5;
    public double HighBatWarnThreshold { get => _highBatWarnThreshold; set { _highBatWarnThreshold = value; OnPropertyChanged(); } }

    private double _overloadWarnThreshold = 1200.0;
    public double OverloadWarnThreshold { get => _overloadWarnThreshold; set { _overloadWarnThreshold = value; OnPropertyChanged(); } }

    private double _tempWarnThreshold = 55.0;
    public double TempWarnThreshold { get => _tempWarnThreshold; set { _tempWarnThreshold = value; OnPropertyChanged(); } }

    private bool _isAudioAlertEnabled = true;
    public bool IsAudioAlertEnabled { get => _isAudioAlertEnabled; set { _isAudioAlertEnabled = value; OnPropertyChanged(); } }

    private int _selectedPollRateMs = 500;
    public int SelectedPollRateMs
    {
        get => _selectedPollRateMs;
        set
        {
            _selectedPollRateMs = value;
            if (_serialManager != null) _serialManager.PollIntervalMs = value;
            OnPropertyChanged();
        }
    }
    public List<int> PollRateOptions { get; } = new() { 500, 1000, 2000 };

    // 歷史數據緩存 (供折線圖)
    public List<(double vbat, double watts)> HistoryPoints { get; } = new();

    public event Action? OnDataRefreshed;

    public MainViewModel()
    {
        InitializeDiagnosticBits();
        _serialManager = new SerialManager();
        _serialManager.OnTelemetryReceived += OnTelemetryReceivedHandler;
        _serialManager.OnStatusChanged += OnStatusChangedHandler;
        _serialManager.OnTxPacket += tx => Application.Current?.Dispatcher.Invoke(() => TxLine = tx);
        _serialManager.OnRxPacket += rx => Application.Current?.Dispatcher.Invoke(() => RxLine = rx);

        RefreshPorts();
    }

    private void InitializeDiagnosticBits()
    {
        var bitDefs = new (int idx, string name, string desc, string cause, string sop, bool isAlarm)[]
        {
            (0, "逆變輸出運作", "逆變電路工作中 (Inverting Active)", "逆變電路已成功啟動並輸出交流電", "正常運行狀態", false),
            (1, "UPS 市電旁路", "負載由市電 Bypass 供應中", "市電正常且旁路繼電器吸合", "正常旁路供電，電池處於浮充或待機", false),
            (2, "市電交流正常", "市電交流輸入電壓正常在線", "偵測到 AC 110V 60Hz 市網", "正常市網輸入", false),
            (3, "市電充電致能", "市網對電池充電迴路工作中", "交流輸入正在向 12V 電池補充電力", "充電中，請保持市電輸入穩定", false),
            (4, "太陽能充電", "太陽能充電輸入運作中", "外接太陽能 MPPT 控制器正在供電", "太陽能綠能充電中", false),
            (5, "綠能節能模式", "低負載自動休眠省電功能工作中", "已發送 W 1 且負載低於 10W 門檻", "休眠待機中，當後端負載大於 10W 時會自動在 1 秒內喚醒輸出", false),
            (6, "散熱風扇運轉", "內部強制風冷散熱風扇啟動", "內部散熱片溫度大於 45°C 或負載大於 30%", "風扇啟動散熱中，請確認進出風口無異物阻塞", false),
            (7, "電池高壓警報", "電池輸入電壓高於預警門檻 (15.5V)", "發電機或充電器充電電壓過高", "請調低充電器電壓或檢查充電控制器，避免損壞逆變器輸入電容", true),
            (8, "電池低壓警報", "電池輸入電壓低於預警門檻 (11.0V)", "電池儲能不足或大電流放電壓降", "請盡快接上市電充電，或切換至綠能節能模式減少負載消耗", true),
            (9, "輕度過載警報", "輸出負載超過 100% 額定容量 (1200W)", "後端電器消耗功率超過連續 1200W", "系統僅容許在 115% 運轉 3 分鐘，請關閉非必要電器", true),
            (10, "重度湧浪過載", "輸出負載達到 115% 限制時間運轉", "感性負載（如馬達、壓縮機）啟動湧浪電流過大", "請檢修負載設備，系統將於 10 秒後自動進入保護關斷", true),
            (11, "交流輸入異常", "市電輸入超出容許頻率或電壓波形", "台電市網停電、欠壓 (<85V) 或頻率漂移", "系統已自動切換至電池逆變供電，請檢查市電插頭", true),
            (12, "高壓母線異常", "機內直流升壓高壓母線電壓偏離", "內部 DC-DC 升壓電路電壓不穩", "請重啟逆變器，若持續異常請聯絡原廠檢修", true),
            (13, "內部過溫警報", "功率元件散熱片溫度接近上限 (>60°C)", "環境溫度過高或風扇積灰轉速下降", "請改善通風散熱條件，待溫度下降後警報將自動解除", true),
            (14, "序列通訊握手", "RS-232 遠端通訊串列資料流同步中", "遠端遙測訊號正常通訊中", "通訊正常", false),
            (15, "節能待機睡眠", "逆變器進入低功耗省電睡眠狀態", "綠能省電模式待機中 (消耗僅 1.5W)", "偵測到負載增加時將自動喚醒", false),
            (16, "逆變故障警告", "硬體嚴重故障告警 (Fault Alarm)", "逆變輸出短路、MOSFET 損壞或嚴重過載", "【緊急】請立即發送 C 0 切斷輸出，排除後端短路後重新冷啟動", true),
            (17, "EEPROM 錯誤", "內部儲存參數晶片讀寫錯誤", "內部校正參數記憶體資料校驗失敗", "請發送 pU 重新進行 V 110 060 參數寫入重設", true),
            (18, "系統綜合警告", "警告旗標觸發，請檢查現場設備", "系統綜合安全聯鎖被觸發", "請於工程模式檢視各狀態燈號並依建議 SOP 排除", true)
        };

        DiagnosticBits.Clear();
        foreach (var def in bitDefs)
        {
            DiagnosticBits.Add(new BitFlagInfo
            {
                Index = def.idx,
                Name = def.name,
                Description = def.desc,
                Cause = def.cause,
                TroubleshootingSop = def.sop,
                IsActive = false,
                IsAlarm = def.isAlarm
            });
        }
    }

    public void RefreshPorts()
    {
        AvailablePorts.Clear();
        var ports = _serialManager.GetAvailablePorts();
        foreach (var p in ports)
        {
            AvailablePorts.Add(p);
        }
        // 若有實體硬體串口 (如 MOXA COM1)，優先選取實體串口讓使用者一目了然；否則選取 AUTO
        var physicalPort = AvailablePorts.FirstOrDefault(p => p.PortName != "AUTO" && p.PortName != "MOCK");
        SelectedPort = physicalPort ?? AvailablePorts.FirstOrDefault();
    }

    public void ToggleConnect()
    {
        if (IsConnected)
        {
            _serialManager.Disconnect();
        }
        else
        {
            if (SelectedPort != null)
            {
                _serialManager.Connect(SelectedPort.PortName);
            }
        }
    }

    public void SendTurnOnAC()
    {
        var res = _serialManager.SendCommand("C 1\r");
        MessageBox.Show(res.message, "操作結果", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
    }

    public void SendTurnOffAC()
    {
        var confirm = MessageBox.Show(
            "⚠️ 確定要切斷逆變器交流電源輸出嗎？\n此操作將瞬間關斷 110V 輸出，後端所有電器設備將會斷電！",
            "危險操作安全確認",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (confirm == MessageBoxResult.Yes)
        {
            var res = _serialManager.SendCommand("C 0\r");
            MessageBox.Show(res.message, "操作結果", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
        }
    }

    public void SendSavingMode(bool enable)
    {
        var cmd = enable ? "W 1\r" : "W 0\r";
        var res = _serialManager.SendCommand(cmd);
        MessageBox.Show(res.message, "操作結果", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
    }

    public void SendUnlock()
    {
        var res = _serialManager.SendCommand("pU\r");
        IsParamUnlocked = res.success;
        MessageBox.Show(res.message, "參數解鎖結果", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
    }

    public void SendQueryDeviceInfo()
    {
        var res = _serialManager.SendCommand("I\r");
        if (SelectedPort?.PortName == "MOCK")
        {
            DeviceInfoText = "MEAN WELL NTU-1200-112US (FW: REV-1.02, 110Vac 60Hz 1200W)";
        }
    }

    public void SendConfigureVoltage(string voltage, string freq)
    {
        // 先發送解鎖，再發送配置
        _serialManager.SendCommand("pU\r");
        Thread.Sleep(50);
        var res = _serialManager.SendCommand($"V {voltage} {freq}\r");
        MessageBox.Show($"輸出配置 ({voltage}V / {freq}Hz): {res.message}", "工程配置結果", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
    }

    public void SendApplySelectedVoltageConfig()
    {
        SendConfigureVoltage(SelectedVoltage, SelectedFreq);
    }

    public void SendQuickCommand(string cmd)
    {
        if (string.IsNullOrWhiteSpace(cmd)) return;
        var res = _serialManager.SendCommand(cmd);
        MessageBox.Show($"快捷指令 [{cmd.Trim()}] 執行結果: {res.message}", "指令發送", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
    }

    public void SendRawCommand(string customCmd)
    {
        if (string.IsNullOrWhiteSpace(customCmd)) return;
        _serialManager.SendCommand(customCmd.Trim());
    }

    public void ApplyScenarioStandard()
    {
        _serialManager.SendCommand("pU\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("V 110 060\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("W 0\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("C 1\r");
        MessageBox.Show("已成功套用【標準長效供電情境】\n• 輸出規範: 110V / 60Hz\n• 逆變輸出: 啟動 (C 1)\n• 節能待機: 停用 (W 0 全時逆變)", "情境套用成功", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    public void ApplyScenarioGreen()
    {
        _serialManager.SendCommand("pU\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("V 110 060\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("W 1\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("C 1\r");
        MessageBox.Show("已成功套用【綠能節電待機情境】\n• 輸出規範: 110V / 60Hz\n• 綠能待機: 啟動 (W 1, 負載 <10W 自動休眠 1.5W)\n• 逆變輸出: 啟動 (C 1)", "情境套用成功", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    public void ApplyScenario120V()
    {
        _serialManager.SendCommand("pU\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("V 120 060\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("C 1\r");
        MessageBox.Show("已成功套用【北美高壓模式】\n• 輸出規範: 120V / 60Hz\n• 逆變輸出: 啟動 (C 1)", "情境套用成功", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    public void ApplyScenario100V()
    {
        _serialManager.SendCommand("pU\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("V 100 050\r");
        Thread.Sleep(40);
        _serialManager.SendCommand("C 1\r");
        MessageBox.Show("已成功套用【日規東部標準】\n• 輸出規範: 100V / 50Hz\n• 逆變輸出: 啟動 (C 1)", "情境套用成功", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    public void ApplyScenarioEmergencyStop()
    {
        var confirm = MessageBox.Show("⚠️ 確定要執行【緊急完全斷電 (E-Stop)】嗎？\n此操作將瞬間關閉逆變輸出 (`C 0`)，所有後端用電設備將立即停止供電！", "緊急斷電安全確認", MessageBoxButton.YesNo, MessageBoxImage.Warning);
        if (confirm == MessageBoxResult.Yes)
        {
            _serialManager.SendCommand("C 0\r");
            MessageBox.Show("已成功發送緊急切斷指令 (`C 0`)！", "緊急斷電已執行", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    public void OpenLogFolder()
    {
        _serialManager.OpenLogFolder();
    }

    public void SaveThresholds()
    {
        MessageBox.Show($"工程警戒門檻與通訊配置已儲存生效：\n• 電池低壓預警: {LowBatWarnThreshold:F1} V\n• 電池低壓切斷: {LowBatCutoffThreshold:F1} V\n• 電池過壓預警: {HighBatWarnThreshold:F1} V\n• 負載過載預警: {OverloadWarnThreshold:F0} W\n• 機溫過熱預警: {TempWarnThreshold:F1} °C\n• 輪詢刷新節奏: {SelectedPollRateMs} ms", "工程門檻配置儲存", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private void OnTelemetryReceivedHandler(NtuTelemetry data)
    {
        Application.Current?.Dispatcher.Invoke(() =>
        {
            BatteryVoltage = data.BatteryVoltage;
            AcOutputVoltage = data.AcOutputVoltage;
            LoadWatts = data.LoadWatts;
            LoadPercent = data.LoadPercent;
            Temperature = data.Temperature;
            GridInputVoltage = data.GridInputVoltage;
            OutputFrequency = data.OutputFrequency;
            DcBusVoltage = data.DcBusVoltage;

            InverterActive = data.InverterActive;
            UtilityBypass = data.UtilityBypass;
            GridNormal = data.GridNormal;
            SavingMode = data.SavingMode;
            Fault = data.Fault;
            EepromError = data.EepromError;

            // 更新 19-Bit 診斷矩陣
            if (!string.IsNullOrEmpty(data.RawBitString))
            {
                for (int i = 0; i < DiagnosticBits.Count && i < data.RawBitString.Length; i++)
                {
                    DiagnosticBits[i].IsActive = data.RawBitString[i] == '1';
                }
            }

            PowerPath = data.PowerPath switch
            {
                "UTILITY_BYPASS" => "市電旁路供電中",
                "INVERTER_BATTERY" => "電池逆變供電中",
                "FAULT" => "設備異常故障！",
                _ => "逆變器待機中"
            };

            // 根據工程人員自訂之門檻判定狀態並警報
            if (BatteryVoltage < LowBatCutoffThreshold)
            {
                BatteryStatusText = $"低壓關斷 (<{LowBatCutoffThreshold:F1}V)";
                if (IsAudioAlertEnabled) System.Media.SystemSounds.Hand.Play();
            }
            else if (BatteryVoltage < LowBatWarnThreshold)
            {
                BatteryStatusText = $"低壓預警 (<{LowBatWarnThreshold:F1}V)";
                if (IsAudioAlertEnabled) System.Media.SystemSounds.Beep.Play();
            }
            else if (BatteryVoltage > HighBatWarnThreshold)
            {
                BatteryStatusText = $"高壓過壓 (>{HighBatWarnThreshold:F1}V)";
                if (IsAudioAlertEnabled) System.Media.SystemSounds.Exclamation.Play();
            }
            else
            {
                BatteryStatusText = "正常良好";
            }

            LatencyMs = data.LatencyMs;

            HistoryPoints.Add((data.BatteryVoltage, data.LoadWatts));
            if (HistoryPoints.Count > 60) HistoryPoints.RemoveAt(0);

            OnDataRefreshed?.Invoke();
        });
    }

    private void OnStatusChangedHandler(string status, bool connected, bool stale)
    {
        Application.Current?.Dispatcher.Invoke(() =>
        {
            StatusText = status;
            IsConnected = connected;
            IsStale = stale;
            ActiveDeviceName = _serialManager.ActivePortName;
        });
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    protected void OnPropertyChanged([CallerMemberName] string? propName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propName));
    }
}
