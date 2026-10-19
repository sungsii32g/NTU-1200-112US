# MEAN WELL NTU-1200-112US 多架構工業級監控控制系統 (Multi-Platform HMI System)

[![PlatformIO](https://img.shields.io/badge/Mode%201-ESP32--S3%20%2B%20LVGL-orange.svg)](esp32-s3-hmi/)
[![Android](https://img.shields.io/badge/Mode%202-Android%20Phone%20HMI-green.svg)](android-phone-hmi/)
[![PC-Laptop](https://img.shields.io/badge/Mode%203-PC%20%2F%20Laptop%20Web%20HMI-blue.svg)](pc-laptop-hmi/)
[![RK3568](https://img.shields.io/badge/Mode%204-RK3568%20Edge%20IPC-purple.svg)](https://www.t-firefly.com/)
[![Target](https://img.shields.io/badge/Hardware-MEAN%20WELL%20NTU--1200--112US-blue.svg)](https://www.meanwell.com/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

專為 **明緯 (MEAN WELL) NTU-1200-112US 正弦波逆變器 / UPS 電源供應系統**（12Vdc 輸入, 110Vac 60Hz 輸出, 連續 1200W / 峰值 2000W）打造的工業級多架構監控與控制解決方案。

本專案支援 **4 種實作模式**，使用者可依據安裝場景、手邊現有硬體或預算彈性選擇，全面發揮現有設備戰力：

---

## 🧭 四大實作模式與特性選型對比

| 比較項目 | 【模式一】ESP32-S3 專用面板 | 【模式二】Android 手機/平板面板 | 【模式三】舊筆電 / 工控 PC 監控中心 | 【模式四】RK3568 (AIO-3568J) 工控主機 |
| :--- | :--- | :--- | :--- | :--- |
| **子專案目錄** | [`esp32-s3-hmi/`](esp32-s3-hmi/) | [`android-phone-hmi/`](android-phone-hmi/) | [`pc-laptop-hmi/`](pc-laptop-hmi/) | 跑 [`android-phone-hmi/`](android-phone-hmi/) 或 [`pc-laptop-hmi/`](pc-laptop-hmi/) |
| **適用設備** | ESP32-S3 開發板 (8MB PSRAM) | 小米 2S (假電池直供) / 紅米 Note 11 Pro | 淘汰之舊筆電 (Win7/10/11, Ubuntu) | AIO-3568J 高性能四核 A55 (1TOPS NPU) |
| **顯示介面** | 3.5 吋 IPS 電容觸控 (480×320) | 4.3 吋 ~ 6.67 吋手機 AMOLED/IPS | 筆電本機螢幕 / 任何瀏覽器 Web HMI | HDMI / MIPI-DSI / LVDS 工業大螢幕 (10~21吋) |
| **USB/串口相容** | UART2 (3.3V) 轉隔離 RS-232 | OTG 轉 FTDI/CH340/MOXA/CP2104 | **自動掃描鎖定現有串口** (MOXA/UNITEK/FTDI) | 板載 RS-232 埠或 USB Host 埠 |
| **供電方案** | 12V 轉 5V 直流降壓 | 外部 4.1V 假電池 / Type-C 邊充邊用 | 筆電自帶電池 + 變壓器 (不斷電備援) | 外部 DC 12V 工業供電 |
| **軟體技術棧** | C++ / FreeRTOS / LVGL 8.3 | Kotlin / Android USB Host / Compose | **Python 3 / Web API / Canvas 儀表** | Android 11/12 或 Ubuntu / Docker |
| **進階特色** | 超低待機功耗、開孔嵌入機櫃 | TTS 語音告警、Telegram 推播 | **CSV 長期日誌、免編譯雙擊即開** | 邊緣物聯網閘道器、多通訊口整合 |
| **最佳應用場景** | 配電盤嵌入式、戶外電源箱 | 24小時無人值守常駐監控 | **工作台/實驗室臨時除錯、舊機再利用** | 工業自動化產線、儲能櫃綜合控制中心 |

---

## 🧰 手邊現有硬體資源清點與最佳即戰力配置

> [!TIP]
> **好消息！運用手邊現有配備，今天即可「零元直接上線」，享受高達 4 kV RMS 的頂規工業隔離保護：**

1. **現有 DB9 串列轉接器組合（今天即可直接接上真實逆變器！）**：
   - **核心神級配件：MOXA TCC-82**（工業級 4-Channel 埠供電 RS-232 光電隔離器，**4 kV RMS 隔離耐壓**，15 kV ESD 防護）。
   - **串接方案**：
     `[舊筆電 / PC / 手機] ──► [MOXA UPort 1110 或 UNITEK USB-RS232] ──► [MOXA TCC-82 光電隔離器] ──► [特製 DB9-RJ11 線] ──► [NTU-1200 Remote Port]`
   - **效益**：原本無隔離的 UPort 1110 或 UNITEK 經過 TCC-82 串接後，瞬間升級為具備 4 kV 光耦隔離的工業級通訊鏈路，徹底免疫大功率逆變器地迴路突波！
2. **現有小型 USB 轉 TTL 模組（開發除錯最佳搭檔）**：
   - **FT232BL (3.3V)** & **CP2104 (3.3V)**：
     - 用於：PC 與手機模擬器閉環對接測試、邏輯分析儀波形抓取、RK3568 Bootloader 除錯。
     - ⚠️ **安全警告**：此兩款為 3.3V TTL 電平，**嚴禁直插 NTU-1200 之 RJ11 (EIA RS-232 ±12V)**！
3. **現有 RK3568 開發板 (AIO-3568J)**：
   - 刷 Android 系統：可直接安裝本專案 `android-phone-hmi`，接上觸控螢幕作為旗艦 HMI。
   - 刷 Linux 系統：可直接執行 `pc-laptop-hmi` 的 Python 伺服器，作為全功能工業閘道器。

---

## 🗂️ 專案資料夾結構

```
NTU-1200-112US/
├── esp32-s3-hmi/                     # 【模式一】ESP32-S3 專用嵌入式觸控控制面板
│   ├── platformio.ini                # PlatformIO 設定 (ESP32-S3, PSRAM, LovyanGFX, LVGL 8.3)
│   ├── src/                          # LVGL 8.3 工業暗黑介面、FreeRTOS 雙任務
│   └── README.md                     # 模式一完整操作與燒錄說明
│
├── android-phone-hmi/                # 【模式二】Android 手機/平板控制面板 (小米/紅米/AIO-3568J)
│   ├── protocol/                     # 【純 Kotlin 協定模組】(可獨立在 PC 執行 JUnit 單元測試)
│   ├── app/                          # 【Android 應用程式模組】(minSdk 21, targetSdk 34)
│   │   ├── src/main/java/            # 串列埠管理、輪詢排程器、5大分頁、TTS 語音
│   │   └── src/main/res/xml/device_filter.xml # 支援 FTDI/CH340/MOXA/CP2104 自動喚醒
│   └── docs/                         # 硬體直供改裝、淘寶採購指南、Golden Fixtures
│
├── pc-laptop-hmi/                    # 【模式三】舊筆電 / 工控 PC 桌面與 Web 監控中心 (新增!)
│   ├── server.py                     # Python 3 後端 (USB 串口自動探測鎖定、500ms 輪詢、REST API)
│   ├── static/                       # 現代工業暗黑風 Web 介面 (HTML5 / CSS3 / Vanilla JS)
│   │   ├── index.html                # 電力潮流拓撲、Canvas 圓弧量表、60s 趨勢圖、安全確認彈窗
│   │   ├── style.css                 # 玻璃擬態、霓虹動態潮流線、響應式佈局
│   │   └── app.js                    # Web Audio 音效警報、狀態輪詢、即時繪圖
│   ├── start_pc_hmi.bat              # Windows 舊筆電雙擊一鍵啟動腳本
│   ├── start_pc_hmi.sh               # Linux / RK3568 一鍵啟動腳本
│   ├── requirements.txt              # 依賴定義 (僅需 pyserial)
│   └── README.md                     # 舊筆電應用完整操作指南
│
├── docs/                             # 通用原廠技術文檔與特製品製作指引
│   ├── Meanwell_NTU-1200-spec-cn.pdf # 明緯原廠規格書 (112US 額定1200W, 110V 60Hz)
│   ├── NTS,NTU-C.pdf                 # 明緯原廠 NTS/NTU 遠端通訊使用手冊
│   ├── NTU-1200-112US_HMI_Manual.md  # 完整工程指南
│   ├── RJ11_RS232_Pinout_Diagram.md  # RJ11 對 DB9 接線圖解 + MOXA TCC-82 4kV 隔離專題
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
