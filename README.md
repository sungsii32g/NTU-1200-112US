# MEAN WELL NTU-1200-112US 雙模式觸控控制面板系統 (Dual-Mode HMI System)

[![PlatformIO](https://img.shields.io/badge/Mode%201-ESP32--S3%20%2B%20LVGL-orange.svg)](file:///esp32-s3-hmi)
[![Android](https://img.shields.io/badge/Mode%202-Android%20Phone%20HMI-green.svg)](file:///android-phone-hmi)
[![Target](https://img.shields.io/badge/Hardware-MEAN%20WELL%20NTU--1200--112US-blue.svg)](https://www.meanwell.com/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

專為 **明緯 (MEAN WELL) NTU-1200-112US 正弦波逆變器 / UPS 電源供應系統**（12Vdc 輸入, 110Vac 60Hz 輸出, 連續 1200W / 峰值 2000W）打造的工業級雙架構 HMI 觸控控制解決方案。

本專案支援 **兩種實作模式**，使用者可依據安裝場景、現有硬體或預算彈性選擇：

---

## 🧭 雙模式特性與工程選型對比

| 比較項目 | 【模式一】ESP32-S3 專用嵌入式面板 | 【模式二：方案 A】小米 2S 舊手機改裝 | 【模式二：方案 B】紅米 Note 11 Pro 旗艦面板 |
| :--- | :--- | :--- | :--- |
| **子專案目錄** | [`esp32-s3-hmi/`](esp32-s3-hmi/) | [`android-phone-hmi/`](android-phone-hmi/) | [`android-phone-hmi/`](android-phone-hmi/) |
| **主控硬體** | ESP32-S3 雙核心 (240MHz, 8MB PSRAM) | 小米 2S (Snapdragon 600, 2GB RAM) | 紅米 Note 11 Pro (Dimensity 920, 6/8GB RAM) |
| **顯示螢幕** | 3.5 吋 IPS 電容觸控 (480×320) | 4.3 吋 IPS LCD (1280×720 720p) | 6.67 吋 AMOLED (2400×1080 120Hz) |
| **供電與電池方案** | 12V 轉 5V 外部降壓供電 (無電池) | **拆除電池，外部 4.1V 穩壓電源直供電池座** | Type-C PD 帶 OTG 分接器 (邊充邊用) |
| **通訊介面** | UART2 (GPIO 17/18) ──► 光耦 RS-232 轉 TTL | Micro-USB 純 OTG ──► 光耦 USB 轉 RS-232 | Type-C OTG ──► 光耦 USB 轉 RS-232 |
| **軟體技術棧** | C++ / FreeRTOS / LVGL 8.3 / LovyanGFX | Kotlin / Android Host API / Coroutines | Kotlin / Android Host API / Coroutines |
| **智慧進階功能** | 本地圖形量表、即時趨勢圖、Demo 模擬 | **TTS 中文真人語音告警**、本地 CSV 日誌 | **TTS 語音**、CSV 日誌、**Telegram/Line 推播** |
| **最佳應用場景** | 機櫃嵌入式開孔安裝、超低待機功耗 | **24小時365天無人值守**、電氣室常駐壁掛 | **房車、露營車、工作台豪華大螢幕監控** |

---

## 🗂️ 專案資料夾結構

```
NTU-1200-112US/
├── esp32-s3-hmi/                     # 【模式一】ESP32-S3 專用嵌入式觸控控制面板
│   ├── platformio.ini                # PlatformIO 設定 (ESP32-S3, PSRAM, LovyanGFX, LVGL 8.3)
│   ├── src/
│   │   ├── main.cpp                  # 系統進入點、硬體隔離雙任務排程
│   │   ├── lv_conf.h                 # LVGL 8.3 設定檔
│   │   ├── ntu_protocol.h / .cpp     # 49 位元組 ASCII 解析狀態機、CheckSum 驗證
│   │   ├── ntu_comm_task.h / .cpp    # 500ms 定時輪詢狀態機與指令隊列
│   │   └── ui_dashboard.h / .cpp     # LVGL 5 大分頁工業暗黑觸控介面
│   └── README.md                     # 模式一完整操作與燒錄說明
│
├── android-phone-hmi/                # 【模式二】Android 手機觸控控制面板 (紅米 / 小米)
│   ├── build.gradle / settings.gradle / gradle.properties
│   ├── docs/
│   │   ├── HARDWARE_MOD_GUIDE.md     # 小米 2S 假電池 4.1V 直供電改造 + 紅米 Note 11 Pro 邊充邊 OTG 指南
│   │   ├── TAOBAO_PROCUREMENT.md     # 淘寶採購清單、搜尋關鍵字、原廠與光耦配件
│   │   └── PROTOCOL_SOURCE.md        # 原廠協定第 5.4 節規範、Golden Fixtures 與實機確認表
│   ├── protocol/                     # 【純 Kotlin 協定模組】(可獨立在 PC 執行 JUnit 單元測試)
│   │   ├── build.gradle
│   │   └── src/
│   │       ├── main/kotlin/com/meanwell/ntu1200/protocol/
│   │       │   ├── NtuCommandSpec.kt     # 協定常數、電氣保護門檻 (10.0V~16.5V)
│   │       │   ├── NtuTelemetryModel.kt  # 遙測數據模型 (含時間戳與有效性)
│   │       │   ├── NtuPacketBuilder.kt   # 指令封包組裝 (Q, I, C, W, pU, V)
│   │       │   └── NtuPacketParser.kt    # 49 位元組 ASCII 解析器
│   │       └── test/kotlin/com/meanwell/ntu1200/protocol/
│   │           └── NtuPacketParserTest.kt# 單元測試 (市電旁路、逆變、低壓預警、故障)
│   └── app/                          # 【Android 應用程式模組】(minSdk 21, targetSdk 34)
│       ├── build.gradle              # usb-serial-for-android, coroutines, material
│       └── src/main/
│           ├── AndroidManifest.xml       # 橫向、常亮、USB_DEVICE_ATTACHED 自動喚醒
│           ├── res/xml/device_filter.xml # FTDI/CH340/PL2303/CP210x 免授權直連
│           ├── res/layout/activity_main.xml
│           └── java/com/meanwell/ntu1200/
│               ├── MainActivity.kt       # 主活動 (5 大分頁、資料流綁定)
│               ├── transport/            # 串列埠管理、500ms 輪詢排程器、Mock 模擬器
│               ├── safety/               # 寫入功能鎖定旗標、1.5秒長按互鎖機制
│               ├── alert/                # TTS 中文語音播報 (冷卻抑制)、Webhook 推播
│               └── ui/                   # 自訂 Canvas 圓弧儀表、電力潮流動畫、防烙印保護層
│
├── docs/                             # 通用原廠技術文檔
│   ├── Meanwell_NTU-1200-spec-cn.pdf # 明緯原廠規格書 (112US 額定1200W, 110V 60Hz)
│   ├── NTS,NTU-C.pdf                 # 明緯原廠 NTS/NTU 遠端通訊使用手冊
│   ├── NTU-1200-112US_HMI_Manual.md  # 完整工程指南
│   ├── RJ11_RS232_Pinout_Diagram.md  # 原廠 RJ11 遠端埠對 DB9 接線圖解
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
