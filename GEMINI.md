# GEMINI.md - NTU-1200-112US 專案工程治理與記憶索引

本檔案為 `NTU-1200-112US`（明緯 MEAN WELL NTU-1200-112US 多架構工業級監控控制系統）的專案記憶基準與架構導覽地圖。後續 AI 與工程師進入本儲存庫進行檢視、維護、除錯或升級時，**強制優先讀取本文件作為事實基準**。

---

## 一、 專案核心基本資料與同名映射

- **本地專案名稱 (`<Project_Key_Name>`)**：`NTU-1200-112US`
- **本地根目錄路徑**：`d:\Work_Room\App_Development\NTU-1200-112US`
- **GitHub 遠端同名倉庫**：`https://github.com/sungsii32g/NTU-1200-112US.git`（1 對 1 同名映射）
- **主要分支**：`main`
- **受控硬體標的**：MEAN WELL 明緯 NTU-1200-112US 正弦波逆變器 / UPS（12Vdc 輸入, 110Vac 60Hz 輸出, 額定 1200W / 峰值 2000W）
- **通訊介面與規格**：Remote Port RJ11 (6P4C) 轉標準 EIA RS-232，9600-8-N-1，ASCII 協定，連續輪詢間隔 $\ge 500\text{ ms}$

---

## 二、 全域工程治理鐵則與紅線規範

1. **每次回覆模式標記（MODE）**：
   - 每段回覆開頭第一行必須明確標記工作模式：`MODE: TRACE_ONLY | PLAN_ONLY | IMPLEMENT | VERIFY_ONLY`。
2. **TRACE_ONLY 唯讀優先**：
   - 凡遇原因不明、跨層異常、硬體協定、併發衝突或高風險更動，一律預設 `TRACE_ONLY`，絕不進行猜測性改碼。
3. **實作前強制 Git 版本回滾備份（Git 優先，嚴禁重複實體拷貝）**：
   - 任何改動前須確認 `git status` 與 `git diff`，並建立 Git 標籤或分支：
     - Tag 規範：`backup/<Project_Key_Name>_YYYYMMDD_HHMMSS`
     - Branch 規範：`backup/<Project_Key_Name>_YYYYMMDD_HHMMSS`
   - **全面禁止在本地硬碟複製冗餘實體資料夾備份**（如 `NTU-1200-112US_backup`）。
4. **黃金路徑保護與協定相容性**：
   - 嚴格保護原廠 7 大 ASCII 核心指令（`Q`, `I`, `C 1`, `C 0`, `W 1`, `W 0`, `pU`, `V`）與 19-Bit 狀態旗標解析契約。
   - 嚴禁破壞 500ms 輪詢節奏與過期標記（Stale Data）防線。
5. **Change_Log 嚴格 APPEND ONLY**：
   - [Change_Log.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/Change_Log.md) 僅能由最末端追加，嚴禁重排、改寫或刪除歷史紀錄。
6. **誠實證據分級制度**：
   - 嚴格區分 `CONFIRMED`（有代碼/日誌直接證據）、`INFERRED`（推論及根據）、`UNKNOWN / NOT PROVEN`（未證實）。
   - 驗證狀態僅限：`PASS`（實跑成功）、`FAIL`（實跑失敗）、`BLOCKED`（硬體受限）、`NOT RUN`（未執行），無實證絕不可宣稱 `PASS`。

---

## 三、 核心架構與五大實作模式導覽地圖

| 模組 / 資料夾 | 架構角色與技術棧 | 關鍵檔案 | 職責與通訊方式 |
|---|---|---|---|
| **【模式一】嵌入式面板** | ESP32-S3 + PlatformIO + LVGL 8.3 + LovyanGFX | [platformio.ini](file:///d:/Work_Room/App_Development/NTU-1200-112US/esp32-s3-hmi/platformio.ini)<br>[README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/esp32-s3-hmi/README.md) | UART2 (3.3V) 轉隔離 RS-232 直連 NTU-1200，提供 3.5 吋電容觸控介面。 |
| **【模式二】Android 平板/手機** | Kotlin + Jetpack Compose + USB Host OTG | [protocol/](file:///d:/Work_Room/App_Development/NTU-1200-112US/android-phone-hmi/protocol/)<br>[app/](file:///d:/Work_Room/App_Development/NTU-1200-112US/android-phone-hmi/app/) | USB OTG 直通 FTDI/CH340/MOXA 晶片，含純 Kotlin 獨立協定解析器與 JUnit 測試。 |
| **【模式三】PC 桌面控制中心** | C# .NET 8/10 WPF + MVVM | [MainWindow.xaml](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/MainWindow.xaml)<br>[SerialManager.cs](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/Services/SerialManager.cs)<br>[NTU1200_HMI.sln](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/NTU1200_HMI.sln) | 筆電/工控機免安裝獨立單一 EXE，智慧自動探測鎖定 COM 埠，60 秒動態趨勢圖與 CSV 匯出。 |
| **【模式四】RK3568 工控主機** | 四核 A55 工控主機 (AIO-3568J) | [android-phone-hmi/](file:///d:/Work_Room/App_Development/NTU-1200-112US/android-phone-hmi/)<br>[pc-laptop-hmi/](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/) | 跑 Android 或 Linux 系統，作為高可靠邊緣物聯網閘道器。 |
| **【模式五】雲端免安裝 Web Serial** | HTML5 + CSS3 + Vanilla JS + W3C Web Serial API | [index.html](file:///d:/Work_Room/App_Development/NTU-1200-112US/index.html)<br>[app.js](file:///d:/Work_Room/App_Development/NTU-1200-112US/app.js)<br>[style.css](file:///d:/Work_Room/App_Development/NTU-1200-112US/style.css)<br>[docs/](file:///d:/Work_Room/App_Development/NTU-1200-112US/docs/) | 託管於 GitHub Pages (`/` 或 `/docs`)，瀏覽器免驅動直通 USB 轉 RS-232，具備 Mock 模擬展示引擎。 |
| **工程規格與原廠手冊** | 原廠技術手冊與接線圖解 | [Meanwell_NTU-1200-spec-cn.pdf](file:///d:/Work_Room/App_Development/NTU-1200-112US/Meanwell_NTU-1200-spec-cn.pdf)<br>[NTS,NTU-C.pdf](file:///d:/Work_Room/App_Development/NTU-1200-112US/docs/NTS,NTU-C.pdf)<br>[RJ11_RS232_Pinout_Diagram.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/docs/RJ11_RS232_Pinout_Diagram.md) | 原廠 ASCII 通訊協定標準、RJ11 腳位定義、MOXA TCC-82 4kV 光耦隔離指南。 |

---

## 四、 七大標準回報區塊結構

後續在進行任何分析或工程實作時，回覆均強制遵循以下 7 大區塊：
1. **MODE**（`TRACE_ONLY` / `PLAN_ONLY` / `IMPLEMENT` / `VERIFY_ONLY`）
2. **結論摘要**（客觀已知結論）
3. **證據鏈**（實際檔案路徑、符號、行號、呼叫鏈或指令）
4. **已確認 / 推論 / 未證實**（`CONFIRMED` / `INFERRED` / `UNKNOWN`）
5. **風險與保留條件**（回歸風險、黃金路徑相容性）
6. **下一步 / 實際修改**（已執行修改與檢查點）
7. **變更與驗證紀錄**（版本回滾對照、`Change_Log.md` 與 `VerificationCoverageMatrix.md` 狀態、命令退出碼）
