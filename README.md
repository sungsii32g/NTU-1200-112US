<p align="center">
  <img src="logo.png" width="180" alt="柴閣巴物 SHIBA & PUG" style="border-radius: 50%; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</p>

# 柴閣巴物 • MEAN WELL NTU-1200-112US 多架構工業級監控控制系統 (Multi-Platform HMI System)

[![PlatformIO](https://img.shields.io/badge/Mode%201-ESP32--S3%20%2B%20LVGL-orange.svg)](esp32-s3-hmi/)
[![Android](https://img.shields.io/badge/Mode%202-Android%20Phone%20HMI-green.svg)](android-phone-hmi/)
[![PC-Laptop](https://img.shields.io/badge/Mode%203-PC%20%2F%20Laptop%20WPF%20EXE-blue.svg)](pc-laptop-hmi/)
[![RK3568](https://img.shields.io/badge/Mode%204-RK3568%20Edge%20IPC-purple.svg)](https://www.t-firefly.com/)
[![Web-Serial](https://img.shields.io/badge/Mode%205-GitHub%20Pages%20Web%20HMI-red.svg)](https://sungsii32g.github.io/NTU-1200-112US/)
[![Target](https://img.shields.io/badge/Hardware-MEAN%20WELL%20NTU--1200--112US-blue.svg)](https://www.meanwell.com/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

專為 **明緯 (MEAN WELL) NTU-1200-112US 正弦波逆變器 / UPS 電源供應系統**（12Vdc 輸入, 110Vac 60Hz 輸出, 連續 1200W / 峰值 2000W）打造的工業級多架構監控與控制解決方案。

> [!IMPORTANT]
> ### 🌐 免安裝雲端 Web Serial 控制中心 (GitHub Pages 線上即開即控)
> - **線上直接運行網址**：👉 **[https://sungsii32g.github.io/NTU-1200-112US/](https://sungsii32g.github.io/NTU-1200-112US/)**
> - **零驅動安裝**：支援 Google Chrome / Microsoft Edge 瀏覽器，透過 W3C Web Serial API 原生直通 USB 轉 RS-232 串口（支援 MOXA、FTDI、UNITEK、CH340、CP210x）。
> - **若 GitHub 倉儲尚未開啟 Pages 服務，請依以下 3 步驟啟用（已做雙重相容）**：
>   1. 進入本 GitHub 倉儲首頁，點選右上角 **`Settings` (設定)**。
>   2. 左側選單點選 **`Pages`**。
>   3. 在 **`Build and deployment`** 區塊：
>      - **推薦方式 A (最簡單)**：`Source` 選擇 **`Deploy from a branch`** ➔ Branch 選擇 **`main`** ➔ 資料夾選擇 **`/ (root)`** 或 **`/docs`** 均可（本專案已同步部署於根目錄與 docs，且均已配置 `.nojekyll` 防止靜態過濾）➔ 點擊 **`Save`**！
>      - **推薦方式 B (自動 CI/CD)**：`Source` 選擇 **`GitHub Actions`**（專案內建 `.github/workflows/deploy-pages.yml`，自動推送建置）。
>   4. 點擊儲存後稍候 1~2 分鐘，點擊上方專屬網址即可秒開 HMI 控制面板！無實體設備時亦提供離線 Mock 模擬展示模式。

---

## 🧭 五大實作模式與特性選型對比

| 比較項目 | 【模式一】ESP32-S3 專用面板 | 【模式二】Android 手機/平板面板 | 【模式三】筆電 / 工控 PC 桌面中心 | 【模式四】RK3568 工控主機 | 【模式五】GitHub Pages 雲端免安裝 Web HMI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **子專案目錄** | [`esp32-s3-hmi/`](esp32-s3-hmi/) | [`android-phone-hmi/`](android-phone-hmi/) | [`pc-laptop-hmi/`](pc-laptop-hmi/) | 跑 [`android-phone-hmi/`](android-phone-hmi/) 或 [`pc-laptop-hmi/`](pc-laptop-hmi/) | [線上即開網址](https://sungsii32g.github.io/NTU-1200-112US/) / [`docs/`](docs/) |
| **適用設備** | ESP32-S3 開發板 (8MB PSRAM) | 小米 2S (假電池直供) / 紅米 Note 11 Pro | 筆電 (Win10/11) / 工控 PC (IPC) | AIO-3568J 高性能四核 A55 | 任何能開瀏覽器的電腦或 Android 手機 |
| **顯示介面** | 3.5 吋 IPS 電容觸控 (480×320) | 4.3 吋 ~ 6.67 吋手機螢幕 | 筆電原生 WPF 視窗 (高對比暗黑風格) | HDMI / LVDS 工業大螢幕 (10~21吋) | 瀏覽器網頁 (Chrome / Edge / Opera) |
| **USB/串口相容** | UART2 (3.3V) 轉隔離 RS-232 | OTG 轉 FTDI/CH340/MOXA/CP2104 | **智慧自動探測鎖定** (MOXA/UNITEK/FTDI) | 板載 RS-232 埠或 USB Host 埠 | **W3C Web Serial API** 原生直連 |
| **安裝門檻** | 需燒錄韌體 | 需安裝 APK | **免安裝，雙擊單一 EXE 即開** | 刷機部署系統 | **零安裝！打開 GitHub 網址即連** |
| **軟體技術棧** | C++ / FreeRTOS / LVGL 8.3 | Kotlin / Android USB Host / Compose | **C# .NET WPF (VS Insiders / VS Code)** | Android 11/12 或 Linux / Docker | **HTML5 + CSS3 + Vanilla JS (Web Serial)** |
| **進階特色** | 超低待機功耗、開孔嵌入機櫃 | TTS 語音告警、Telegram 推播 | **一鍵工程情境、自訂警戒門檻、CSV 匯出** | 邊緣物聯網閘道器、多通訊口整合 | **19-Bit 點擊排錯 SOP、音效警報、CSV 匯出** |
| **最佳應用場景** | 配電盤嵌入式、戶外電源箱 | 24小時無人值守常駐監控 | **工作台/實驗室調試、筆電高效監控** | 工業自動化產線、儲能櫃綜合控制中心 | **跨裝置應急即時檢修、手機/平板隨開隨測** |

---

## 🎛️ 全平台統一介面架構：雙模式設計標準

為了讓現場操作人員與研發工程師在各端（PC 桌面版、網頁版、手機版）享有一致的操作體驗，本專案將介面與控制權限嚴格劃分為兩大模式：

### 1. 【📊 即時監控模式 (Monitoring Mode)】—— 現場安全直觀巡檢
- **動態能量流拓撲圖**：實時呈現 DC 直流側與 AC 交流側能量流向動畫與即時數值。
- **四大量測核心儀表**：電池輸入電壓 (V)、輸出交流電壓 (V)、負載功率 (W / %)、逆變器內部溫度 (°C)。
- **60 秒即時動態趨勢圖**：即時繪製電壓波動與負載負載曲線，瞬態脈衝無所遁形。
- **即時警報與狀態指示條**：正常狀態呈現科技藍綠色，異常時自動跳紅閃爍告警。

### 2. 【🛠️ 工程應用模式 (Engineering / Pro Mode)】—— 完整設備配置與進階控制
- **輸出電源控制 (`C 1` / `C 0`)**：支援一鍵開啟或關閉 110Vac 輸出，具備防誤觸二次確認對話框。
- **節能待機開關 (`W 1` / `W 0`)**：配置是否開啟綠能節能模式（無負載時自動睡眠）。
- **輸出電壓與頻率校正配置 (`V <WWW> <0FF>`)**：具備工程參數解鎖防護（`pU`），提供 100V / 110V / 115V / 120V 與 50Hz / 60Hz 快速切換。
- **設備硬體資訊讀取 (`I`)**：一鍵獲取逆變器完整製造型號、軟韌體版本與工廠出廠序號。
- **19-Bit 狀態旗標解析面板**：逐位解析過溫、短路、過載、DC 欠壓/過壓等 19 個硬體狀態位元。
- **原始 ASCII 指令終端機**：提供手動指令發送框與即時通訊日誌視窗，支援 Hex/ASCII 對比分析。

---

## 🧰 手邊現有硬體資源清點與最佳即戰力配置

> [!TIP]
> **好消息！運用手邊現有配備，今天即可「零元直接上線」，享受高達 4 kV RMS 的頂規工業隔離保護：**

1. **核心神級配件：MOXA TCC-82（工業級 4-Channel 埠供電 RS-232 光電隔離器，4 kV RMS 隔離耐壓）**：
   - **全模式通用保險**：TCC-82 採標準 DB9 母進公出，**在全模式（模式一至模式五）中均可自由串接使用**！
   - **通用串接原則**：除非直接使用一體成型的「微雪 Waveshare 工業級隔離 USB 轉 RS232/485」，否則任何非隔離轉接方案（**MOXA UPort 1110、UNITEK USB-RS232、MAX3232 模組、FT232BL / CP2104**），**只要在輸出端串上 MOXA TCC-82，立刻全模式升級為具備 4 kV 光耦電氣隔離的最高防護等級**！
   - **實體串接方案**：
     `[主控：筆電 / PC / 手機 / RK3568 / ESP32] ──► [USB轉RS232模組] ──► [MOXA TCC-82 (4kV 光電隔離器)] ──► [特製 DB9-RJ11 線] ──► [NTU-1200 Remote Port]`
2. **現有小型 USB 轉 TTL 模組（開發除錯最佳搭檔）**：
   - **FT232BL (3.3V)** & **CP2104 (3.3V)**：
     - 用於：PC 與手機模擬器閉環對接測試、邏輯分析儀波形抓取、RK3568 Bootloader 除錯。
     - ⚠️ **安全警告**：此兩款為 3.3V TTL 電平，**嚴禁直插 NTU-1200 之 RJ11 (EIA RS-232 ±12V)**！
3. **現有 RK3568 開發板 (AIO-3568J)**：
   - 刷 Android 系統：可直接安裝本專案 `android-phone-hmi`，接上觸控螢幕作為旗艦 HMI。
   - 刷 Linux 系統：可直接執行 `pc-laptop-hmi` 或在瀏覽器開啟 `web-serial-hmi`，作為全功能工業閘道器。

---

## 🗂️ 專案資料夾結構

```
NTU-1200-112US/
├── esp32-s3-hmi/                     # 【模式一】ESP32-S3 專用嵌入式觸控控制面板 (LVGL 8.3)
│   ├── platformio.ini                # PlatformIO 設定 (ESP32-S3, PSRAM, LovyanGFX)
│   └── README.md                     # 模式一完整操作與燒錄說明
│
├── android-phone-hmi/                # 【模式二】Android 手機/平板控制面板 (小米/紅米/AIO-3568J)
│   ├── protocol/                     # 【純 Kotlin 協定模組】(PC 可獨立跑 JUnit 測試)
│   ├── app/                          # 【Android 應用程式模組】(minSdk 21, targetSdk 34)
│   └── docs/                         # 硬體直供改裝、淘寶採購指南、Golden Fixtures
│
├── pc-laptop-hmi/                    # 【模式三】筆電 / 工控 PC 桌面與 Web 監控中心 (VS / VS Code / EXE)
│   ├── NTU1200_HMI.sln               # Visual Studio Insiders / VS 2022 方案檔
│   ├── Ntu1200Hmi.csproj             # .NET 8/10 WPF 專案檔 (相容 Visual Studio Code)
│   ├── MainWindow.xaml / .cs         # 高對比通訊埠選單、雙模式切換、電力潮流、趨勢圖
│   ├── ViewModels/ / Models/         # MVVM 數據模型、自動探測與 500ms 輪詢排程
│   ├── publish/                      # 發布目錄 (內含編譯好的獨立單一 NTU1200_HMI.exe，雙擊即開)
│   └── README.md                     # 筆電 / PC 應用完整操作與編譯指南
│
├── web-serial-hmi/                   # 【模式五】GitHub Pages 雲端免安裝 Web Serial HMI (純前端)
│   ├── index.html                    # 零安裝 Web 應用首頁 (雙模式介面、安全彈窗、動態圖表)
│   ├── style.css                     # 工業級暗黑美學樣式表、響應式佈局
│   ├── app.js                        # W3C Web Serial 通訊驅動、自動輪詢、展示模式引擎
│   └── README.md                     # Web HMI 操作手冊與 GitHub Pages 設定教學
│
├── docs/                             # GitHub Pages 線上託管目錄 & 通用原廠技術文檔
│   ├── index.html / style.css / app.js # GitHub Pages 直接託管之 Web HMI 實體檔案
│   ├── Meanwell_NTU-1200-spec-cn.pdf # 明緯原廠規格書 (112US 額定1200W, 110V 60Hz)
│   ├── NTS,NTU-C.pdf                 # 明緯原廠 NTS/NTU 遠端通訊使用手冊
│   ├── NTU-1200-112US_HMI_Manual.md  # 完整工程指南
│   ├── RJ11_RS232_Pinout_Diagram.md  # RJ11 對 DB9 接線圖解 + MOXA TCC-82 全模式 4kV 隔離專題
│   └── protocol-source.md            # 通用協定來源與 Golden Fixtures
│
└── README.md                         # 本總導覽文件
```


---

## 🔌 通用硬體連接規範 (原廠 Remote Port RJ11)


明緯 NTU-1200-112US 機身後方的 Remote Port 為 **RJ11 (6P4C) 母座**，訊號為標準 EIA/TIA-232 電平（±5V ~ ±12V）：

```
NTU-1200-112US (RJ11)               標準 RS-232 (DB9)
┌──────────────┐                     ┌────────────────────────┐
│   RJ11       │                     │   DB9                  │
│              │                     │                        │
│ Pin 2 (Rx) ──┼────────────────────►│ Pin 3 (TXD)            │
│ Pin 3 (GND) ─┼────────────────────►│ Pin 5 (GND)            │
│ Pin 4 (Tx) ──┼────────────────────►│ Pin 2 (RXD)            │
└──────────────┘                     └────────────────────────┘
```

> [!CAUTION]
> **嚴正安全警語**：
> 不論採用微控制器或 Android 手機，連接時**務必使用具備「光耦電氣隔離 (Optical Isolation)」的轉換模組 (如 FT232RL 隔離模組)**。
> ⚠️ **注意**：市售知名之 **MOXA UPort 1110 內部「無光耦隔離」**（僅具 ESD 靜電保護），無法阻斷大功率逆變器之地迴路突波；若選 MOXA 需指定光耦隔離款 **UPort 1150I**。詳細選型分析與自製線材防呆製作圖解請見：[RJ11 實體接線圖解與選型指南](file:///d:/Work_Room/App_Development/NTU-1200-112US/docs/RJ11_RS232_Pinout_Diagram.md)。
> 當 1200W 逆變器帶載大功率負載時，12V 電池負極母線會產生壓降與突波，光耦隔離能徹底切斷接地迴路 (Ground Loop)，保護手機主板與 USB 主控晶片！

---

## ⏱️ 輪詢時序硬性規範 (依原廠第 5.4 節)

* **串列配置**：`9600 baud, 8 data bits, 1 stop bit, No parity (9600-8-N-1)`
* **連續請求間隔**：$\ge 500\text{ ms}$
* **封包最小間隔**：$\ge 10\text{ ms}$
* **逆變器回應時間**：典型 $\le 15\text{ ms}$，讀取逾時設為 $150\text{ ms}$
* **過期標示 (Stale Data)**：若連續 3 次未收到回應（$>1.5\text{ s}$），數值變灰並標記 `STALE`

---

## 🛡️ 分階段安全推進流程

1. **Phase 0：零程式碼先行驗證**：
   - 手機安裝免費 App《Serial USB Terminal》，接上 OTG + 光耦 RS-232 + RJ11 線。
   - 逆變器不接交流負載，手動發送 `Q\r` 與 `I\r`，截圖確認實機 ASCII 回傳格式。
2. **Phase 1：模擬模式與 UI 驗證**：
   - 執行 `protocol/` 模組的 JUnit 單元測試。
   - App 啟動「DEMO 模擬模式」，驗證 5 大分頁、圓弧量表、TTS 中文語音播報與防烙印保護。
3. **Phase 2：實機唯讀長期燒機 (24~72 小時)**：
   - 插線連接真實 NTU-1200，所有寫入命令保持 `LOCKED`。連續觀測 48 小時穩定性。
4. **Phase 3：受控寫入功能解鎖**：
   - 經工程二次確認後，測試遠端 `C 1\r` / `C 0\r` 輸出開關控制。

---

## 📄 開源授權

本專案採 MIT 授權條款開源發布。
