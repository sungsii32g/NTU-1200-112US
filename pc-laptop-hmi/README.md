# MEAN WELL NTU-1200-112US 舊筆電 / 工控 PC 桌面與 Web 監控中心 (PC-Laptop HMI)

[![Python](https://img.shields.io/badge/Python-3.7%2B-blue.svg)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20RK3568-brightgreen.svg)]()
[![Web](https://img.shields.io/badge/Web-Modern%20Industrial%20Dark-orange.svg)]()

專為 **舊筆電 (Windows 7/10/11 或 Linux)**、工控無風扇主機、以及 **RK3568 (AIO-3568J Linux 韌體)** 打造的輕量化、高效能逆變器監控中心。

無需安裝龐大的肥大軟體或編譯環境，只要有 Python 3 與瀏覽器，點擊即可全功能運行！

---

## 🌟 核心特色功能

1. **USB 串列埠智慧自動識別與握手 (Auto-Detection)**：
   * 自動枚舉作業系統所有 COM 埠 (`serial.tools.list_ports`)。
   * 自動辨識手邊現有硬體：
     - **MOXA UPort 1110 / 1150** (VID: `0x110A`)
     - **UNITEK USB2.0 to RS232** (PL2303 / CH340 / FTDI)
     - **FTDI FT232BL / FT232RL / 隔離模組** (VID: `0x0403`)
     - **Silicon Labs CP2104 / CP2102** (VID: `0x10C4`)
     - **沁恆 CH340 / CH341** (VID: `0x1A86`)
   * **自動探測模式 (`AUTO`)**：背景自動向各通訊埠發送 `Q\r`，收到符合格式的 `(...)` 遙測封包即自動鎖定連線，插上即用！
2. **現代工業暗黑風 Web 監控介面 (Industrial Dark HMI)**：
   * **電力潮流動態流向卡片 (Power Flow)**：動態虛線呈現市電 110V、UPS 旁路、電池逆變升壓與交流負載潮流。
   * **Canvas 半圓弧儀表量表**：即時繪製電池電壓 (綠/橘/紅三色門檻)、交流輸出功率 (W) 與負載率 (%)。
   * **60 秒滾動歷史趨勢圖**：雙 Y 軸即時追蹤電池電壓與負載瓦數變化。
   * **硬體旗標解析器**：即時解析 19-Bit 狀態字串 (逆變器啟動、UPS 旁路、市電正常、節能模式、故障異常)。
3. **音效警報與安全互鎖控制 (Safety Interlock)**：
   * 當電池電壓低於 11.0V (預警) 或 10.0V (關斷) 時，自動跳出警報橫幅並發出 Web Audio 音效警報。
   * 交流電源切斷 (`C 0`) 與啟動 (`C 1`) 具備二次確認 Modal 彈窗，避免誤觸導致伺服器斷電。
4. **離線模擬示範模式 (Demo Mock Mode)**：
   * 手邊沒有插逆變器時，在通訊埠下拉選單選擇「離線展示模式」，後端會自動模擬動態遙測數據，便於展示與驗證。
5. **歷史紀錄自動存檔 (CSV Data Logging)**：
   * 自動將即時數據寫入 `logs/ntu1200_telemetry_YYYY-MM-DD.csv`，方便日後以 Excel 分析電池放電曲線。

---

## 🚀 快速啟動指引

### Windows (舊筆電 / PC)
直接雙擊執行目錄下的批次檔：
```cmd
start_pc_hmi.bat
```
*該腳本會自動檢查 Python、自動安裝 `pyserial`、啟動伺服器並自動開啟瀏覽器前往 `http://localhost:8080`。*

### Linux / RK3568 (AIO-3568J Ubuntu / Debian)
賦予權限並執行：
```bash
chmod +x start_pc_hmi.sh
./start_pc_hmi.sh
```

### 手動指令啟動 (跨平台通用)
```bash
# 1. 安裝唯一定義依賴
pip install pyserial

# 2. 啟動後端伺服器
python server.py
```
啟動後打開任何瀏覽器（Chrome, Edge, Firefox）輸入：
👉 **`http://localhost:8080`**

---

## 🔌 現有硬體搭配推薦 (零元直接上線)

針對手邊擁有的現有配備：
* **舊筆電 USB** ──► **MOXA UPort 1110 (或 UNITEK)** ──► **MOXA TCC-82 (4 kV 光耦隔離器)** ──► **自製 DB9 轉 RJ11 線** ──► **NTU-1200 RJ11 埠**。
* 舊筆電會自動辨識出 `COMx (MOXA UPort 1110)`，透過 TCC-82 提供 4 kV 頂規隔離防護，安全無虞！
