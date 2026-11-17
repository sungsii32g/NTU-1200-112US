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
        _serialManager.OnDeviceInfoReceived += info => Application.Current?.Dispatcher.Invoke(() => DeviceInfoText = info);

        RefreshPorts();
    }

    private void InitializeDiagnosticBits()
    {
        // 依據明緯原廠 NTS,NTU-C.pdf 規格書第 37~39 頁定義 100% 精準對齊
        var bitDefs = new (int idx, string name, string desc, string cause, string sop, bool isAlarm)[]
        {
            (0, "逆變輸出運作", "逆變電路工作中 (INVERTER Mode)", "逆變電路已成功啟動並輸出交流電", "正常運行狀態。若需重設參數，請先確認後端負載安全。", false),
            (1, "UPS 市電旁路", "負載由市電 Bypass 供應中 (Bypass Mode)", "市電正常且機內旁路繼電器吸合，交流輸出直通市電", "正常旁路供電，電池處於浮充或待機備援狀態。", false),
            (2, "市電輸入正常", "市電輸入電壓正常在線 (Utility Power Supply)", "偵測到 AC 110V 60Hz 市網輸入", "正常市網輸入狀態，具備斷電切換 UPS 能力。", false),
            (3, "市電充電致能", "市電充電迴路工作中 (Utility Charger Enable)", "交流市電輸入正在向 12V 直流電池補充電力", "充電進行中，請保持市電輸入穩定，避免中途強行斷電。", false),
            (4, "太陽能充電", "太陽能充電輸入運作中 (Solar Charger Enable)", "外接太陽能 MPPT 充電控制器正在為電池供電", "太陽能綠能充電中，可搭配電池優先模式發揮最佳發電效益。", false),
            (5, "綠能節能模式", "處於節能休眠模式 (Saving Mode Occurred)", "DIP SW4 啟用節能模式且負載低於 10W 門檻", "休眠待機中，當後端負載大於 10W 時會自動在 1 秒內喚醒輸出。", false),
            (6, "電池欠壓告警", "電池電壓低於預警值 (Battery Exhausted Mode / Battery Low)", "電池電量即將耗盡或大電流放電造成壓降 (12V 型號 <11.0V)", "請盡速接上市電充電，或關閉非關鍵高耗電負載。", true),
            (7, "電池耗盡停機", "電池沒電停機保護 (Shutdown Mode / Battery Used Up)", "電池電壓低於停機下限 (12V 型號 <10.0V)，逆變器切斷以保護電池壽命", "【停機保護】請立刻連接市電充電，充飽後方可重新啟動輸出。", true),
            (8, "電池過壓保護", "電池輸入電壓過高保護 (Battery OVP)", "外接發電機或充電器充電電壓異常飆高 (12V 型號 >15.5V)", "請立即檢查並調低充電控制器輸出電壓，避免損壞逆變器輸入端濾波電容。", true),
            (9, "遙控關閉狀態", "處於遠端通訊關閉狀態 (Remote Shutdown INVERTER)", "已由遠端通訊發送 C 關機指令 (C100000000000000) 或機身 R.C. 端口短路遙控關閉", "若需恢復輸出，請發送開機指令 C010000000000000 或將 R.C. 端口開路。", true),
            (10, "輕度過載警報", "輸出負載達 100%~115% 額定容量 (OLP 100~115%)", "後端電器連續負載功率略微超過額定容量 1200W", "系統僅容許在 115% 運轉約 3 分鐘，請關閉次要設備以防超時保護關斷。", true),
            (11, "中度過載警報", "輸出負載達 115%~150% 額定容量 (OLP 115~150%)", "後端負載功率顯著超過額定值，功率開關元件應力與溫升急速攀升", "系統將於 10 秒內緊急保護切斷輸出，請立即拔除非必要高耗能電器！", true),
            (12, "重度過載關斷", "輸出負載大於 150% 極限關斷 (OLP 150%~)", "負載端發生嚴重短路或超大馬達瞬間啟動湧浪電流", "【緊急關斷】逆變電路已自動鎖定切斷輸出。請排除負載短路後重新冷啟動。", true),
            (13, "過溫/風扇異常", "內部過溫保護 (OTP) 或散熱風扇堵轉 (Fan Lock Protection)", "功率元件散熱片溫度超過上限 (>60°C) 或機殼散熱風扇積灰受阻轉速異常", "請清除進出風口異物障礙，加強通風，待溫度降回正常範圍後將自動復原。", true),
            (14, "輸出欠壓保護", "交流輸出電壓低於下限保護 (INV UVP Protection)", "交流輸出端電壓異常下跌 (<85Vac) 或輸出負載嚴重拉垮", "請檢查負載是否過重拉垮電壓，若無負載仍欠壓請聯絡原廠檢修。", true),
            (15, "輸出過壓保護", "交流輸出電壓高於上限保護 (INV OVP Protection)", "交流反饋電路異常或逆變輸出電壓過高 (>135Vac)", "請立即切斷逆變輸出，重新冷啟動；若重啟仍過壓請送回明緯原廠檢修。", true),
            (16, "逆變硬體故障", "逆變功率模組硬體嚴重故障告警 (INV Fault)", "逆變輸出短路、功率開關元件 (MOSFET) 損壞或驅動晶片硬體故障", "【硬體故障】請立即關閉機身總電源，切勿強行送電，聯絡原廠技術支援。", true),
            (17, "EEPROM 錯誤", "機內儲存校正參數校驗錯誤 (EEPROM Error Code)", "內部校正參數記憶體資料校驗碼 (CRC) 失敗", "請發送 pU 參數解鎖，重新進行 V 輸出參數寫入重設。", true),
            (18, "系統綜合關機", "系統安全保護停機狀態 (System Shutdown)", "多重保護聯鎖觸發導致系統進入全面保護性關閉", "請檢視上方各告警燈號，依個別 SOP 排除故障後重新啟動主機。", true)
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
        // 依據 NTS,NTU-C.pdf 規格書第 39、49 頁標準 Remote ON 幀
        var res = _serialManager.SendCommand("C010000000000000\r");
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
            // 依據 NTS,NTU-C.pdf 規格書第 39、49 頁標準 Remote OFF 幀
            var res = _serialManager.SendCommand("C100000000000000\r");
            MessageBox.Show(res.message, "操作結果", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
        }
    }

    public void SendSavingMode(bool enable)
    {
        MessageBox.Show(
            $"依據明緯原廠 NTS,NTU-C.pdf 規格書第 43 頁備註：綠能節能模式 (Saving Mode) 係由機身面板 DIP SW4 開關硬體控制 (ON: 啟用, OFF: 關閉)。\n\n請直接將機身面板 DIP SW4 撥至 {(enable ? "ON (啟用節能待機)" : "OFF (關閉節能待機)")}。",
            "節能模式操作指引",
            MessageBoxButton.OK,
            MessageBoxImage.Information);
    }

    public void SendUnlock()
    {
        var res = _serialManager.SendCommand("pU\r");
        IsParamUnlocked = res.success;
        MessageBox.Show(res.message, "參數解鎖結果", MessageBoxButton.OK, res.success ? MessageBoxImage.Information : MessageBoxImage.Warning);
    }

    public void SendQueryDeviceInfo()
    {
        DeviceInfoText = "正在發送 I 指令讀取設備資訊...";
        var res = _serialManager.SendCommand("I\r");
        if (SelectedPort?.PortName == "MOCK")
        {
            DeviceInfoText = "MEAN WELL NTU-1200-112US (FW: REV-1.02, 110Vac 60Hz 1200W)";
        }
        else if (!res.success)
        {
            DeviceInfoText = $"發送 I 失敗: {res.message}";
        }
    }

    public void SendConfigureVoltage(string voltage, string freq)
    {
        // 依據 NTS,NTU-C.pdf 規格書第 35、40、50 頁規範：
        // 1. 先發送 pU 解鎖
        _serialManager.SendCommand("pU\r");
        // 2. 延遲 >= 20ms 後發送帶 2-Byte Checksum 的 V 指令封包
        Thread.Sleep(60);
        int.TryParse(voltage, out var v);
        int.TryParse(freq, out var f);
        var res = _serialManager.SendVoltageConfig(v, f);
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

    public void ApplyBatteryPreset(string preset)
    {
        switch (preset.ToLowerInvariant())
        {
            case "uxh100":
                LowBatWarnThreshold = 11.5;
                LowBatCutoffThreshold = 10.6;
                OverloadWarnThreshold = 950;
                TempWarnThreshold = 55.0;
                MessageBox.Show("✅ 已成功一鍵套用【湯淺 YUASA UXH100-12FR】建議門檻：\n" +
                                "• 電池低壓預警: 11.5 V（剩餘約 25%~30%，提醒市電回充或減載）\n" +
                                "• 電池低壓切斷: 10.6 V（對齊原廠 10.50V~10.80V 放電終止線，防止極板硫化）\n" +
                                "• 負載過載容量: 950 W（單顆 100Ah 電池在大電流 90A+ 下壓降溫升保護）\n" +
                                "• 內部過溫警戒: 55.0 °C\n\n" +
                                "💡 貼心提醒：25°C 下標準浮充電壓為 13.65V ± 0.15V，外部充電電流請限制在 25A 以下。",
                                "UXH100-12FR 電池門檻配置", MessageBoxButton.OK, MessageBoxImage.Information);
                break;
            case "agmgel":
                LowBatWarnThreshold = 11.6;
                LowBatCutoffThreshold = 10.8;
                OverloadWarnThreshold = 1000;
                TempWarnThreshold = 55.0;
                MessageBox.Show("✅ 已成功一鍵套用【常規 AGM / GEL 膠體深循環電池】建議門檻：\n" +
                                "• 電池低壓預警: 11.6 V\n" +
                                "• 電池低壓切斷: 10.8 V\n" +
                                "• 負載過載容量: 1000 W\n" +
                                "• 內部過溫警戒: 55.0 °C",
                                "常規深循環電池門檻配置", MessageBoxButton.OK, MessageBoxImage.Information);
                break;
            case "lifepo4":
                LowBatWarnThreshold = 12.5;
                LowBatCutoffThreshold = 11.2;
                OverloadWarnThreshold = 1200;
                TempWarnThreshold = 50.0;
                MessageBox.Show("✅ 已成功一鍵套用【磷酸鐵鋰 LiFePO4 (4S)】建議門檻：\n" +
                                "• 電池低壓預警: 12.5 V (鐵鋰放電平台平坦，12.5V 進入後段拐點)\n" +
                                "• 電池低壓切斷: 11.2 V (單芯 2.8V 截止，防止觸發 BMS 硬切斷)\n" +
                                "• 負載過載容量: 1200 W (鋰電池支援大倍率全功率輸出)\n" +
                                "• 內部過溫警戒: 50.0 °C",
                                "磷酸鐵鋰門檻配置", MessageBoxButton.OK, MessageBoxImage.Information);
                break;
            case "default":
            default:
                LowBatWarnThreshold = 11.0;
                LowBatCutoffThreshold = 10.0;
                OverloadWarnThreshold = 1200;
                TempWarnThreshold = 65.0;
                MessageBox.Show("✅ 已恢復【明緯原廠出廠預設值】：\n" +
                                "• 電池低壓預警: 11.0 V\n" +
                                "• 電池低壓切斷: 10.0 V\n" +
                                "• 負載過載容量: 1200 W\n" +
                                "• 內部過溫警戒: 65.0 °C",
                                "原廠預設門檻配置", MessageBoxButton.OK, MessageBoxImage.Information);
                break;
        }
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
