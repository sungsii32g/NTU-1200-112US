# 模式二：MEAN WELL NTU-1200-112US Android 手機觸控控制面板 (Android Phone HMI)

[![Platform](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com/)
[![Kotlin](https://img.shields.io/badge/Kotlin-1.9.22-purple.svg)](https://kotlinlang.org/)
[![Hardware](https://img.shields.io/badge/Target-Redmi%20Note%2011%20Pro%20%7C%20Mi%202S-blue.svg)](https://mi.com/)
[![Protocol](https://img.shields.io/badge/MEAN%20WELL-NTU--1200--112US-green.svg)](https://www.meanwell.com/)

本專案為 **明緯 (MEAN WELL) NTU-1200-112US 正弦波逆變器 / UPS 電源供應系統** 之 **【模式二：Android 舊手機改裝觸控 HMI 控制面板】**。

規劃以舊款 Android 手機（**紅米 Note 11 Pro** 或 **小米 2S**）透過 **USB OTG 轉光耦隔離 RS-232 介面**，打造低成本、高畫質、具備真人語音告警與連網通報能力的工業級觸控監控終端。

---

## 📱 雙手機硬體特性與工程選型

| 評估項目 | 小米 2S (Xiaomi Mi 2S) | 紅米 Note 11 Pro (Redmi Note 11 Pro) | 工程選型建議 |
| :--- | :--- | :--- | :--- |
| **最大工程優勢** | **可拆卸電池！** 可直接由外部 4.1V 穩壓電源直供電池接口，**徹底根除鋰電池膨脹風險** | 6.67 吋 FHD+ AMOLED 大螢幕、現代 Android API、高效能流暢動效 | **長期固定壁掛/無人看管選「小米 2S」**；<br>**追求大螢幕極致視覺選「紅米 Note 11 Pro」** |
| **USB 與供電關係** | 電源由電池接口直入，Micro-USB 埠 100% 專職純 OTG 數據傳輸，**免除邊充邊 OTG 衝突** | Type-C 介面支援 USB PD，可透過「Type-C PD + USB OTG 分接器」實現邊充邊傳輸 | 小米 2S 外部直供電電氣結構最乾淨 |
| **Android 系統** | 原生 Android 4.1~5.0 (或刷入 LineageOS Android 7~10) | Android 11~13 (API 30~33) | 本專案 `minSdk = 21` (支援 5.0+)，兼容兩者 |
| **螢幕特性與保護**| 4.3 吋 IPS LCD (1280×720)，無 AMOLED 烙印問題，適合 24 小時常亮 | 6.67 吋 AMOLED (2400×1080)，純黑省電，實作 60 秒無操作自動微亮待機防烙印 | 兩者均採用純黑工業深色主題 (`#000000`) |

---

## 🔌 硬體連接拓撲

### 方案 A：小米 2S 外部電源直供 + 純 OTG (免電池常態運作)
```
[外部 5V/12V 電源] ──► [DC-DC 降壓至 4.10V] ──► (焊接至小米 2S 電池保護板 B+/B-，NTC 接地)
                                                │
┌──────────────────┐    ┌────────────────────┐  │  ┌──────────────────────┐    ┌───────────────────┐
│  小米 2S 手機    │    │ Micro-USB OTG 短線 │  │  │ 光耦隔離型 USB 轉    │    │  NTU-1200-112US   │
│ (免電池常駐運作) ├───►│ (純數據 Host 模式) ├──┴─►│ RS-232 (FT232RL)     ├───►│  Remote Port      │
└──────────────────┘    └────────────────────┘     │ DB9 Pin 3/5/2        │    │  RJ11 Pin 2/3/4   │
                                                   └──────────────────────┘    └───────────────────┘
```

### 方案 B：紅米 Note 11 Pro Type-C 邊充邊 OTG
```
┌──────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐    ┌───────────────────┐
│ 紅米 Note 11 Pro │    │ Type-C OTG 分接器    │    │ 光耦隔離型 USB 轉    │    │  NTU-1200-112US   │
│ (Type-C 介面)    ├───►│ (支援 PD 邊充邊用)   ├───►│ RS-232 (FT232RL)     ├───►│  Remote Port      │
└──────────────────┘    └──────────┬───────────┘    │ DB9 Pin 3/5/2        │    │  RJ11 Pin 2/3/4   │
                                   │                └──────────────────────┘    └───────────────────┘
                         ┌─────────┴──────────┐
                         │  PD 5V 充電器      │
                         └────────────────────┘
```

---

## 🎨 橫向工業儀表 UI 規劃

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ NTU-1200-112US  [● 已連線 12ms]   路徑: 市電旁路 (UPS)    語音:開   19:30   │ <- 頂部常駐狀態列
├──────────────────────┬──────────────────────────┬────────────────────────┤
│  【 電池 DC 輸入 】  │   【 電力潮流與狀態 】   │  【 交流 AC 輸出 】    │
│                      │                          │                        │
│       12.8 V         │ [市電] ══► (旁路供電中)  │    110 V / 60.0 Hz     │
│ [■■■■■■■□□□] 82%    │ [電池] ──► (逆變待命)    │    負載: 35% (~420 W)  │
│ 狀態: 正常(10~16.5V) │ 溫度: 36.5 °C (正常)     │    狀態: 輸出正常      │
├──────────────────────┴──────────────────────────┴────────────────────────┤
│ [ 1. 總覽儀表 ] [ 2. 趨勢曲線 ] [ 3. 模式與控制 ] [ 4. 告警與語音 ] [ 5. 診斷 ]│ <- 5大導航分頁
└──────────────────────────────────────────────────────────────────────────┘
```

### 5 大核心功能頁面：
1. **總覽儀表板 (Dashboard)**：全螢幕橫向、電池電壓弧形量表、即時電力潮流動畫、負載與換算瓦數、逾時變灰過期標示。
2. **即時數據與歷史曲線 (Trends)**：雙軸即時曲線圖（電池電壓 vs 交流負載率），本機每日自動儲存為 `.csv`，支援 Wi-Fi 匯出。
3. **模式與安全控制 (Control)**：逆變器開關、節能模式，受 **三道安全防護鎖** 管控（工程鎖 ──► 1.5 秒長按 ──► 二次確認彈窗 ──► 單次發送不重試 ──► 立即回讀）。
4. **智慧告警與語音/推播 (Alarms)**：內建 **Android TTS 中文真人語音播報**（具備抑制冷卻時間）+ **Telegram/Line Webhook** 遠端推播。
5. **通訊診斷與工程設定 (Debug)**：TX/RX 計數、Checksum/Timeout 計數、即時 Raw ASCII/Hex 監視器、唯讀單發測試器。

---

## 🧩 專案模組架構

```
android-phone-hmi/
├── build.gradle              # 專案級 Gradle 設定檔
├── settings.gradle           # 子模組設定 (:app, :protocol)
├── gradle.properties         # JVM 與 AndroidX 設定
├── docs/
│   ├── HARDWARE_MOD_GUIDE.md # 小米 2S 假電池改造與紅米邊充邊 OTG 詳細電氣指南
│   ├── TAOBAO_PROCUREMENT.md # 淘寶採購關鍵字、選型要點與檢核表
│   └── PROTOCOL_SOURCE.md    # 原廠協定第 5.4 節規範、Golden Fixtures 與實機確認表
├── protocol/                 # 【純 Kotlin 模組】不依賴 Android SDK，可直接在 PC 跑 JUnit 測試
│   ├── build.gradle
│   └── src/
│       ├── main/kotlin/com/meanwell/ntu1200/protocol/
│       │   ├── NtuCommandSpec.kt     # 指令集與常數規範
│       │   ├── NtuTelemetryModel.kt  # 遙測數據模型 (含數值、單位、isValid、過期標記)
│       │   ├── NtuPacketBuilder.kt   # 指令封包組裝與 Checksum 計算
│       │   └── NtuPacketParser.kt    # 49 位元組 ASCII 解析狀態機
│       └── test/kotlin/com/meanwell/ntu1200/protocol/
│           └── NtuPacketParserTest.kt# JUnit 單元測試 (含市電旁路、逆變、低壓告警驗證)
└── app/                      # 【Android 主應用模組】
    ├── build.gradle          # minSdk 21, targetSdk 34, usb-serial-for-android
    └── src/main/
        ├── AndroidManifest.xml       # 橫向、常亮、USB_DEVICE_ATTACHED 自動掛載
        ├── res/
        │   ├── xml/device_filter.xml # FTDI/CH340/PL2303/CP210x 自動免確認授權
        │   ├── layout/activity_main.xml
        │   └── values/ (colors, strings, styles)
        └── java/com/meanwell/ntu1200/
            ├── MainActivity.kt
            ├── transport/            # USB 串列埠管理、500ms 輪詢排程器、Mock 模擬器
            ├── safety/               # 寫入功能鎖定旗標、1.5秒長按互鎖控制器
            ├── alert/                # TTS 語音播報、告警引擎、Webhook 推播
            └── ui/                   # 自訂 Canvas 圓弧儀表、電力潮流動畫、防烙印保護層
```
