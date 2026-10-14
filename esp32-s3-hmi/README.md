# 模式一：MEAN WELL NTU-1200-112US ESP32-S3 嵌入式觸控控制面板 (ESP32-S3 HMI)

[![PlatformIO](https://img.shields.io/badge/PlatformIO-ESP32--S3-orange.svg)](https://platformio.org/)
[![LVGL](https://img.shields.io/badge/LVGL-v8.3.11-blue.svg)](https://lvgl.io/)
[![Hardware](https://img.shields.io/badge/MEAN%20WELL-NTU--1200--112US-green.svg)](https://www.meanwell.com/)

本子專案為 **明緯 (MEAN WELL) NTU-1200-112US 正弦波逆變器 / UPS 電源供應系統** 之 **【模式一：ESP32-S3 專用嵌入式觸控控制面板】**。

使用專屬微控制器 (ESP32-S3) 搭配 3.5 吋 IPS 電容觸控螢幕，適合固定安裝於機櫃或逆變器旁作為獨立監控面板。

---

## 🌟 核心特點

1. **雙核心 FreeRTOS 硬體隔離**：
   - **Core 0 (`ntu_uart_task`)**：專職處理 9600-8-N-1 UART 串列通訊、500ms 定時輪詢與指令隊列，嚴格維持時序。
   - **Core 1 (`gui_task`)**：專職執行 LVGL 8.3 圖形渲染與電容觸控掃描，介面順暢達 60 FPS。
2. **現代暗黑工業介面**：
   - 儀表總覽、即時趨勢 (LVGL Chart)、安全控制 (長按二次確認)、歷史告警、系統設定（含背光調節與 Demo 模擬器）。
3. **安全電氣隔離**：
   - 強制搭配光耦隔離 RS-232 轉 TTL 模組，徹底隔絕 12V 大電流逆變之接地迴路突波。

---

## 🔌 硬體連接與 RJ11 腳位

```
NTU-1200-112US (RJ11)         光耦隔離 RS-232 轉 TTL (3.3V)         ESP32-S3 開發板
Pin 2 (Rx) ───────────────────► RS232-TXD
Pin 3 (GND) ──────────────────► RS232-GND
Pin 4 (Tx) ───────────────────► RS232-RXD
                                TTL-TXD ──────────────────────────► GPIO 18 (RX2)
                                TTL-RXD ◄────────────────────────── GPIO 17 (TX2)
                                TTL-GND ──────────────────────────► GND
                                TTL-VCC ◄────────────────────────── 3.3V
```

### 腳位對照表

| 功能定義 | NTU 遠端埠 (RJ11) | 標準 DB9 腳位 | 光耦隔離模組端 | ESP32-S3 (3.3V TTL) |
| :--- | :--- | :--- | :--- | :--- |
| **NTU 接收 (Rx)** | **Pin 2** | Pin 3 (TXD) | TXD / R1OUT | **GPIO 17 (TX2)** |
| **信號地 (GND)** | **Pin 3** | Pin 5 (GND) | GND | **GND (共地)** |
| **NTU 發送 (Tx)** | **Pin 4** | Pin 2 (RXD) | RXD / T1IN | **GPIO 18 (RX2)** |

---

## 📁 檔案結構

```
esp32-s3-hmi/
├── platformio.ini       # PlatformIO 專案設定檔 (ESP32-S3, PSRAM, LovyanGFX, LVGL 8.3)
├── src/
│   ├── main.cpp         # 系統進入點、觸控與顯示驅動掛載、FreeRTOS 雙任務排程
│   ├── lv_conf.h        # LVGL 8.3 設定檔 (自訂色調、記憶體池設定)
│   ├── ntu_protocol.h   # 明緯 ASCII 協定定義、資料模型、校驗演算法
│   ├── ntu_protocol.cpp # 49 位元組 ASCII 解析狀態機、CheckSum 驗證
│   ├── ntu_comm_task.h  # 通訊任務與執行緒安全 API
│   ├── ntu_comm_task.cpp# 500ms 輪詢排程、離線 Demo 產生器
│   ├── ui_dashboard.h   # LVGL UI 宣告
│   └── ui_dashboard.cpp # 5 大分頁介面 (儀表總覽、趨勢、安全控制、告警、設定)
└── README.md            # 本說明文件
```

---

## 🛠️ 編譯與燒錄

### PlatformIO (推薦)
```bash
cd esp32-s3-hmi
pio run --target upload
pio run --target monitor
```

### Arduino IDE
- 安裝 `esp32 by Espressif` (v2.0.14+)。
- 安裝 `lvgl` (8.3.11) 與 `LovyanGFX`。
- 選擇板型：`ESP32S3 Dev Module`，`PSRAM: OPI PSRAM`，`USB CDC On Boot: Enabled`。
