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


    // 歷史數據緩存 (供折線圖)
    public List<(double vbat, double watts)> HistoryPoints { get; } = new();

    public event Action? OnDataRefreshed;

    public MainViewModel()
    {
        _serialManager = new SerialManager();
        _serialManager.OnTelemetryReceived += OnTelemetryReceivedHandler;
        _serialManager.OnStatusChanged += OnStatusChangedHandler;
        _serialManager.OnTxPacket += tx => Application.Current?.Dispatcher.Invoke(() => TxLine = tx);
        _serialManager.OnRxPacket += rx => Application.Current?.Dispatcher.Invoke(() => RxLine = rx);

        RefreshPorts();
    }

    public void RefreshPorts()
    {
        AvailablePorts.Clear();
        var ports = _serialManager.GetAvailablePorts();
        foreach (var p in ports)
        {
            AvailablePorts.Add(p);
        }
        SelectedPort = AvailablePorts.FirstOrDefault();
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

    public void SendRawCommand(string customCmd)
    {
        if (string.IsNullOrWhiteSpace(customCmd)) return;
        _serialManager.SendCommand(customCmd.Trim());
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

            PowerPath = data.PowerPath switch
            {
                "UTILITY_BYPASS" => "市電旁路供電中",
                "INVERTER_BATTERY" => "電池逆變供電中",
                "FAULT" => "設備異常故障！",
                _ => "逆變器待機中"
            };

            BatteryStatusText = data.BatteryStatus switch
            {
                "LOW_SHUTDOWN" => "低壓關斷 (<10.0V)",
                "LOW_ALARM" => "低壓預警 (<11.0V)",
                "HIGH_SHUTDOWN" => "高壓關斷 (>16.5V)",
                "HIGH_ALARM" => "高壓預警 (>15.5V)",
                _ => "正常良好"
            };

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
