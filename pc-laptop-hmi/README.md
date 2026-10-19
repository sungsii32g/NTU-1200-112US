# MEAN WELL NTU-1200-112US 筆電 / 工控 PC 桌面與 Web 監控中心 (PC-Laptop HMI)

[![Visual Studio](https://img.shields.io/badge/IDE-Visual%20Studio%20Insiders%20%7C%20VS%20Code-purple.svg)](https://visualstudio.microsoft.com/)
[![.NET](https://img.shields.io/badge/.NET-8.0%20%2F%2010.0%20(WPF)-blue.svg)](https://dotnet.microsoft.com/)
[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20%7C%20IPC-brightgreen.svg)]()
[![EXE](https://img.shields.io/badge/Binary-Native%20NTU1200__HMI.exe-orange.svg)]()

專為 **筆電 (Windows 10/11) 與工控 PC (IPC)** 打造的原生桌面高更新率監控中心。
支援使用 **Visual Studio Insiders** 或 **Visual Studio Code** 開啟方案自行編譯除錯，亦可一鍵打包生成獨立運行的 **`NTU1200_HMI.exe`**。

---

## 🌟 核心特色功能

1. **Visual Studio 系列原生支援 (.NET 8/10 WPF)**：
   * 內附完整 **`NTU1200_HMI.sln`** 方案檔與 **`Ntu1200Hmi.csproj`** 專案檔。
   * 可直接使用 **Visual Studio Insiders** 或 **Visual Studio Code** 開啟，支援完整的 IntelliSense、中斷點 (Breakpoints) 與單步除錯。
   * 執行目錄下的 `build_exe.bat` 可秒級編譯出獨立運行的單一執行檔 `publish/NTU1200_HMI.exe`。
2. **USB 串列埠智慧辨識與自動探測鎖定 (`AUTO`)**：
   * 透過 WMI 與 Windows 驅動層自動識別已插入的 USB 配件：
     - **MOXA UPort 1110 / 1150** (VID: `0x110A`)
     - **UNITEK USB2.0 to RS232** (PL2303 / CH340 / FTDI)
     - **FTDI FT232BL / FT232RL / 隔離模組** (VID: `0x0403`)
     - **Silicon Labs CP2104 / CP2102** (VID: `0x10C4`)
     - **沁恆 CH340 / CH341** (VID: `0x1A86`)
   * **`AUTO` 探測模式**：背景自動向現有通訊埠輪詢 `Q\r`，收到符合格式的 `(...)` 遙測封包即自動鎖定連線，插上即連！
3. **現代工業暗黑風桌面介面 (Modern Industrial Dark Theme)**：
   * **電力潮流即時拓撲 (Power Flow)**：動態呈現市電 110V、UPS 旁路、電池逆變升壓與交流負載流向。
   * **核心儀表網格**：即時顯示直流電池電壓 (10.0V 關斷/11.0V 預警/12.6V 良好)、交流負載瓦數 (W) 與負載率 (%)、散熱器溫度 (°C)。
   * **60 秒滾動即時趨勢圖**：雙 Y 軸繪製電池電壓與負載瓦數曲線。
   * **硬體旗標解析器**：即時解析逆變器運轉、UPS 旁路、市電狀態、節能模式、故障異常與 EEPROM 狀態。
4. **安全互鎖操作 (Safety Interlock)**：
   * 遠端切斷交流輸出 (`C 0`) 具備二次確認 MessageBox 防呆彈窗，避免誤觸斷電導致後端負載停機。
   * 支援開啟逆變輸出 (`C 1`)、節能模式切換 (`W 1` / `W 0`) 與參數解鎖 (`pU`)。
5. **長週期 CSV 自動存檔**：
   * 自動在 `logs/` 目錄寫入每日遙測記錄 (`ntu1200_YYYY-MM-DD.csv`)。
6. **雙架構兼容 (含 Web 網頁監控版)**：
   * 同時保留輕量化 Python Web 伺服器 (`server.py` + `static/`)，若需透過手機或平板瀏覽器遠端查看亦可一鍵啟動。

---

## 🚀 開發與編譯指南

### 1. 使用 Visual Studio Insiders 開啟
1. 直接雙擊開啟目錄下的方案檔：
   👉 **`NTU1200_HMI.sln`**
2. 在 Visual Studio 中選擇 `Release` 或 `Debug` 模式。
3. 按下鍵盤 **`F5`** (啟動偵錯) 或 **`Ctrl + F5`** (啟動不偵錯) 即可直接運行。

### 2. 使用 Visual Studio Code 開啟
1. 在本目錄開啟終端機執行：
   ```bash
   code .
   ```
2. 安裝 Microsoft 官方之 **C# Dev Kit** 擴充套件。
3. 按下 `F5` 即可直接進行斷點除錯。

### 3. 一鍵生成獨立 EXE 執行檔
直接雙擊執行目錄下的建置批次檔：
```cmd
build_exe.bat
```
編譯完成後，即可在 **`publish/`** 目錄取得：
👉 **`publish\NTU1200_HMI.exe`**（約 600 KB，點擊即可獨立運行）。

---

## 🔌 現有硬體搭配推薦 (零元直接上線)

* **接線路徑**：
  `筆電 USB ──► MOXA UPort 1110 (或 UNITEK) ──► MOXA TCC-82 (4 kV 光電隔離器) ──► 特製 DB9-RJ11 線 ──► NTU-1200 Remote Port`
* **隔離防護**：
  透過串接手邊現有的 **MOXA TCC-82**，提供高達 **4 kV RMS** 的實質光電隔離，徹底保護筆電主機板，無須等待外購模組！
