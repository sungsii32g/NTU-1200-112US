# NTU-1200-112US 雲端免安裝 Web Serial 監控與工程 HMI

本專案提供完全基於瀏覽器標準技術（**HTML5 + CSS3 + Vanilla JavaScript + W3C Web Serial API**）開發的工業級逆變器控制台。**無須在電腦或手機上安裝任何後端服務、Python 或執行檔**，只需透過支援 Web Serial API 的瀏覽器（Google Chrome、Microsoft Edge、Opera 或 Android 版 Chrome）打開 GitHub Pages 網址，即可直接與 NTU-1200 逆變器進行雙向通訊控制！

---

## 🌟 核心特色

1. **零安裝・即開即用 (Zero-Install Pure Web)**：
   - 100% 純前端靜態網頁架構，無後端相依，可直接託管於 GitHub Pages。
   - 瀏覽器原生支援 HTTPS，完全符合 Web Serial API 的安全性規範。

2. **跨平台極限支援**：
   - **電腦端 (Windows / macOS / Linux / ChromeOS)**：Chrome / Edge 瀏覽器直接辨識 USB 轉 RS-232 介面卡。
   - **手機與平板 (Android)**：Android 裝置搭配 USB OTG 轉接線與 FTDI / CH340 / CP210x 晶片，在 Chrome 瀏覽器中授權即可連線。
   - **無硬體時自動切換「展示模式 (Demo Mode)」**：若使用不支援的瀏覽器（如 iOS Safari）或未連接實體硬體，可點擊「展示模式」模擬即時數據流。

3. **介面風格完全統一（雙模式架構）**：
   與 PC 桌面版 (WPF) 具備完全相同的色彩管理與操作邏輯：
   - **📊 即時監控模式 (Monitoring Mode)**：動態 AC/DC 能量流拓撲、四大量測儀表（電池電壓、輸出電壓、負載瓦數、逆變器溫度）、60 秒即時電壓負載趨勢折線圖、警報跑馬燈與狀態指示。
   - **🛠️ 工程應用模式 (Engineering / Pro Mode)**：
     - **輸出負載電源開關**：具備安全二次確認彈窗防呆機制 (`C 1` / `C 0`)。
     - **節能待機模式切換**：`W 1`（開啟待機）/ `W 0`（關閉待機）。
     - **輸出電壓與頻率校正配置**：具備參數解鎖保護機制 (`pU`)，提供 100V / 110V / 115V / 120V 與 50Hz / 60Hz 快速切換 (`V <WWW> <0FF>`)。
     - **設備硬體資訊讀取**：單擊發送 `I\r` 讀取型號、韌體版本與製造序號。
     - **19-Bit 狀態旗標解析面板**：即時位元解析（位元 0 ~ 18），包含過溫、短路、過載、DC 輸入異常警報。
     - **原始通訊指令終端機**：可手動輸入任何 RS-232 ASCII 指令並即時觀察 Hex/ASCII 回應。

---

## 🚀 部署至 GitHub Pages

本專案目錄已同步發佈至儲存庫中的 `/docs` 資料夾，您只需在 GitHub 上完成以下 3 個步驟即可啟用線上網頁：

1. 登入 GitHub，進入本專案儲存庫頁面：`https://github.com/sungsii32g/NTU-1200-112US`
2. 點擊頂部的 **「Settings」** -> 左側選單點擊 **「Pages」**。
3. 在 **「Build and deployment」** 區塊：
   - **Source** 選擇：`Deploy from a branch`
   - **Branch** 選擇：`main` 分支，資料夾選擇 `/docs`
   - 點擊 **「Save」** 儲存。
4. 約 1~2 分鐘後，即可在頁面上方獲得專屬網址：
   👉 **`https://sungsii32g.github.io/NTU-1200-112US/`**

---

## 🔌 硬體連接指南

### 1. 通訊參數規範
- **鮑率 (Baud Rate)**：`9600 bps`
- **資料位元 (Data Bits)**：`8`
- **同位元 (Parity)**：`None (無)`
- **停止位元 (Stop Bits)**：`1`
- **流控 (Flow Control)**：`None (無)`

### 2. 支援硬體與隔離模組
| 轉接模組 / 晶片 | 建議搭配隔離方案 | 適用裝置 |
| :--- | :--- | :--- |
| **微雪 Waveshare 工業級 USB 轉 RS232** | 內部已自帶 ADuM 光電磁隔離與電源隔離，直接插上即可 | PC 筆電 / Android 手機 OTG / RK3568 |
| **MOXA UPort 1110** | **強烈建議後方加裝 MOXA TCC-82 光電隔離器** | PC 筆電 / 工控 PC |
| **UNITEK USB 轉 RS232** | **強烈建議後方加裝 MOXA TCC-82 光電隔離器** | PC 筆電 / 工控 PC |
| **FTDI FT232BL / CP2104 模組** | **強烈建議後方加裝 MOXA TCC-82 光電隔離器** | PC 筆電 / Android 手機 / RK3568 |

> **⚠️ 工業安全警語**：
> 明緯 NTU-1200 RS-232 內部的通訊地線（RJ11 Pin 3）直接連接逆變器負載內部邏輯接地。為防止地電位差或雷擊突波擊毀電腦主機板或手機 Type-C 連接埠，非隔離型轉接模組請務必串接 **MOXA TCC-82 (具備 4 kV RMS 光電隔離)**！

---

## 💻 本地測試與離線運行

如果您希望在沒有網路的環境下運行：
1. 直接使用 Chrome 或 Edge 瀏覽器打開 `web-serial-hmi/index.html`。
2. 或在專案目錄下啟動本機簡易 HTTP 伺服器：
   ```bash
   # 使用 Python
   python -m http.server 8080 --directory web-serial-hmi
   # 接著在瀏覽器打開 http://localhost:8080
   ```
