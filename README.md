# MEAN WELL NTU-1200-112US 觸控控制面板系統 (HMI System)

[![PlatformIO](https://img.shields.io/badge/PlatformIO-ESP32--S3-orange.svg)](https://platformio.org/)
[![LVGL](https://img.shields.io/badge/LVGL-v8.3.11-blue.svg)](https://lvgl.io/)
[![Hardware](https://img.shields.io/badge/MEAN%20WELL-NTU--1200--112US-green.svg)](https://www.meanwell.com/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

專為 **明緯 (MEAN WELL) NTU-1200-112US 正弦波逆變器 / UPS 電源供應系統** 開發之嵌入式人機觸控介面 (HMI)。  
基於 **ESP32-S3** 雙核心微控制器、**LVGL 8.3** 工業級圖形函式庫與 **FreeRTOS** 雙任務排程架構，實現毫秒級無延遲觸控與嚴格符合原廠通訊時序之電力遙測監控。

---

## 📸 介面與功能展示

```
┌────────────────────────────────────────────────────────┐
│ NTU-1200-112US   [● 連線正常]   [UPS市電旁路]   01:25:30 │ <- 頂部狀態列
├────────────────────────────────────────────────────────┤
│ 市電 110V ──▶ [UPS 旁路切換] ──▶ AC 輸出 110V (420W)   │ <- 電力拓撲卡片
│ 電池 12.6V ─▶ [DC-AC 逆變]                               │
├─────────────────┬──────────────────┬───────────────────┤
│  電池電壓 (正常) │ 輸出負載 (1200W) │    機內散熱溫度   │
│     ( 12.6 V )  │    (  35 %  )    │      38.5 °C       │
│   動態彩色量表  │     420 W        │  額定1200W/峰值2KW│
├─────────────────┴──────────────────┴───────────────────┤
│ [ 儀表總覽 ] [ 即時數據 ] [ 控制操作 ] [ 歷史告警 ] [ 系統設定 ]│ <- 5大導航分頁
└────────────────────────────────────────────────────────┘
```

---

## ⚡ 目標機型規格 (NTU-1200-112US)

* **直流輸入標稱**：12Vdc (正常工作區間 10.0Vdc ~ 16.5Vdc)
* **交流輸出標稱**：110Vac, 60Hz 純正弦波 (具備市電 UPS 無縫旁路切換功能)
* **輸出容量**：連續額定 1200W、輕度過載 1380W (3分鐘)、峰值湧浪 2000W (10秒)
* **通訊接口**：原廠 Remote Port (RJ11 6P4C) RS-232 介面 (9600-8-N-1, ASCII)
* **原廠保護門檻**：
  * **電池低壓預警 (Low Alarm)**：`11.0V ± 0.3V` (儀表轉為橘色提醒)
  * **電池低壓切斷 (Low Shutdown)**：`10.0V ± 0.3V` (紅色警報並切斷)
  * **電池低壓重啟 (Low Restart)**：`12.5V ± 0.3V`
  * **電池高壓預警 (High Alarm)**：`15.5V ± 0.3V`
  * **電池高壓切斷 (High Shutdown)**：`16.5V ± 0.3V`

---

## 🔌 硬體連接與電氣隔離設計

> [!CAUTION]
> **重要電氣隔離提醒**：  
> 明緯 NTU-1200 的 Remote port 為標準 EIA/TIA-232 電平（±5V ~ ±12V）。**切勿將 RJ11 訊號線直接連接 ESP32 GPIO**！  
> 大電流逆變開關伴隨高頻共模噪訊與接地迴路突波，**強烈要求必須搭配「光耦隔離 RS-232 轉 TTL (3.3V) 模組」**。

```
NTU-1200-112US                光耦隔離 RS-232 轉 TTL 模組              ESP32-S3 (3.5" 觸控螢幕)
┌──────────────┐               ┌────────────────────────┐              ┌────────────────┐
│ RJ11 (6P4C)  │               │ (切斷突波與接地迴路)   │              │                │
│              │               │                        │              │                │
│ Pin 2 (Rx) ──┼──────────────►│ RS232-TXD              │              │                │
│ Pin 3 (GND) ─┼──────────────►│ RS232-GND              │              │                │
│ Pin 4 (Tx) ──┼──────────────►│ RS232-RXD              │              │                │
│              │               │                        │              │                │
│              │               │ TTL-TXD ───────────────┼─────────────►│ GPIO 18 (RX2)  │
│              │               │ TTL-RXD ◄──────────────┼──────────────│ GPIO 17 (TX2)  │
│              │               │ TTL-GND ───────────────┼─────────────►│ GND            │
│              │               │ TTL-VCC ◄──────────────┼──────────────│ 3.3V           │
└──────────────┘               └────────────────────────┘              └────────────────┘
```

### RJ11 與 ESP32 接線對照表

| 功能定義 | NTU 遠程端口 (RJ11) | 標準 DB9 腳位 | 光耦隔離模組端 | 轉接至 ESP32-S3 (3.3V) |
| :--- | :--- | :--- | :--- | :--- |
| **NTU 接收 (Rx)** | **Pin 2** | Pin 3 (TXD) | TXD / R1OUT | **GPIO 17 (TX2)** |
| **信號地 (GND)** | **Pin 3** | Pin 5 (GND) | GND | **GND (共地)** |
| **NTU 發送 (Tx)** | **Pin 4** | Pin 2 (RXD) | RXD / T1IN | **GPIO 18 (RX2)** |

---

## 🧠 軟體架構 (FreeRTOS 雙任務排程)

系統透過 ESP32-S3 雙核心進行任務硬體隔離，確保介面達到 60 FPS 順暢體驗：

```
                    ESP32-S3 雙核心 FreeRTOS 排程
      ┌────────────────────────────────────────────────────────┐
      │                        Core 0                          │
      │  ntu_uart_task (明緯協定任務，優先級 3)                  │
      │  ├─ 每 500ms 嚴格定時發送 "Q\r" 狀態查詢                │
      │  ├─ 150ms 逾時檢測與自動斷線重試機制                    │
      │  ├─ 非阻塞式指令隊列 (輸出開關控制、pU 解鎖、模式設定) │
      │  └─ Thread-safe Mutex 更新全域遙測結構體               │
      └──────────────────────────┬─────────────────────────────┘
                                 │ 互斥鎖 (Mutex) & 隊列 (Queue)
      ┌──────────────────────────┴─────────────────────────────┐
      │                        Core 1                          │
      │  gui_task (LVGL 介面與觸控任務，優先級 2)                │
      │  ├─ 每 5ms 執行 lv_timer_handler()                     │
      │  ├─ 每 150ms 讀取最新電力數據並動態刷新螢幕             │
      │  └─ 取樣電容觸控 (FT6336U/GT911)                       │
      └────────────────────────────────────────────────────────┘
```

---

## 📂 專案模組結構

```
NTU-1200-112US/
├── platformio.ini              # PlatformIO 設定檔 (ESP32-S3, PSRAM, LovyanGFX, LVGL 8.3)
├── src/
│   ├── main.cpp                # 系統進入點、顯示/觸控驅動掛載、FreeRTOS 雙任務啟動
│   ├── lv_conf.h               # LVGL 8.3 設定檔 (暗黑工業主題、記憶體池設定)
│   ├── ntu_protocol.h          # 明緯協定資料結構、保護門檻、指令組裝與解析原型
│   ├── ntu_protocol.cpp        # 49 位元組 ASCII 解析狀態機、CheckSum 計算、指令組裝
│   ├── ntu_comm_task.h         # FreeRTOS 通訊任務與執行緒安全 API
│   ├── ntu_comm_task.cpp       # 500ms 定時輪詢狀態機、指令隊列、桌面離線 Demo 模擬器
│   ├── ui_dashboard.h          # LVGL 介面初始化與更新函式
│   └── ui_dashboard.cpp        # 5 大分頁介面 (儀表總覽、即時趨勢、安全互鎖控制、告警、設定)
├── docs/
│   └── NTU-1200-112US_HMI_Manual.md # 完整工程手冊、淘寶採購 BOM 表、協定詳解
├── Meanwell_NTU-1200-spec-cn.pdf    # 明緯原廠 NTU-1200 規格書 (參考依據)
├── NTS,NTU-C.pdf                    # 明緯原廠 NTS/NTU 遠端通訊使用手冊 (參考依據)
└── README.md
```

---

## 🛠️ 編譯與燒錄

### 方法一：使用 PlatformIO (推薦)

1. 安裝 [Visual Studio Code](https://code.visualstudio.com/) 與 **PlatformIO IDE** 擴充套件。
2. 開啟本專案目錄。
3. 將 ESP32-S3 開發板透過 USB 連接至電腦。
4. 點擊下方狀態列之 **Upload** 或在終端執行：
   ```bash
   pio run --target upload
   pio run --target monitor
   ```

### 方法二：使用 Arduino IDE

1. 開啟 Arduino IDE，安裝開發板核心 **esp32 by Espressif Systems** (v2.0.14+)。
2. 安裝必要函式庫：
   * `lvgl` (8.3.11)
   * `LovyanGFX` (1.1.12+)
3. 於「工具」選單選擇：
   * 板子：`ESP32S3 Dev Module`
   * USB CDC On Boot：`Enabled`
   * PSRAM：`OPI PSRAM` (依模組規格)
   * Flash Size：`16MB` (或 `8MB`)
4. 開啟專案並點擊「上傳」。

---

## 📄 開源授權

本專案採 MIT 授權條款開源發布。
