# Verification Coverage Matrix (NTU-1200-112US 驗證覆蓋矩陣)

本文件用以真實追蹤本專案各模式（ESP32、Android、WPF PC、Web Serial）之單元測試、靜態檢查、相依性構建與硬體連線驗證狀態。
**誠實原則**：未實際執行之項目標記為 `NOT RUN`；因缺少實體硬體或環境受限標記為 `BLOCKED`；真實執行並確認回傳碼為 0 且通過者方可標記為 `PASS`。嚴禁填寫虛構之測試通過紀錄。

---

## 一、 測試與驗證項目追查矩陣

| 驗證 ID | 目標模組 | 驗證項目與層級 | 執行指令 / 驗證方法 | 預期通過標準 | 狀態 (`PASS` / `FAIL` / `BLOCKED` / `NOT RUN`) | 實際驗證證據與執行備註 |
|---|---|---|---|---|---|---|
| **V-GOV-01** | 全域專案 | Git 工作區乾淨度檢查 | `git status` | 工作區乾淨，無衝突變更 | **PASS** | 2026-10-22 16:34:26 執行通過，working tree clean |
| **V-GOV-02** | 全域專案 | 升級前備份標籤建立 | `git tag backup/pre-governance-upgrade-...` | 標籤成功建立並同步至遠端 | **PASS** | `backup/pre-governance-upgrade-20261022163432` 已推至 origin |
| **V-GOV-03** | 全域專案 | 遠端倉庫 1 對 1 同名映射檢查 | `git remote -v` | 本地與遠端均為 `NTU-1200-112US` | **PASS** | origin 指向 `sungsii32g/NTU-1200-112US.git` |
| **V-WEB-01** | Web Serial HMI | HTML/JS 靜態語法與資源引用 | 檢查 `index.html`, `app.js`, `style.css` 語法與標記 | 無語法中斷與缺失檔案 | **NOT RUN** | 待下階段 PWA 升級後執行完整檢查 |
| **V-WEB-02** | Web Serial HMI | 本地 Localhost 安全環境通訊 | 執行 `start_web_local.bat` 驗證安全上下文 | 瀏覽器載入並啟用 `navigator.serial` | **NOT RUN** | 待後續本機服務啟動驗證 |
| **V-WEB-03** | Web Serial HMI | 離線模擬展示引擎 (Demo Mode) | 點擊「模擬模式」檢查 4 大儀表與 60s 趨勢圖 | 假數據依 500ms 節奏刷新且趨勢圖繪製正常 | **NOT RUN** | 待瀏覽器實測 |
| **V-WEB-04** | Web Serial HMI | 19-Bit 狀態旗標與 SOP Modal | 點擊故障位元檢查 SOP 診斷彈窗內容 | 正確解析位元、成因分析與 SOP 指令調度 | **NOT RUN** | 待瀏覽器實測 |
| **V-AND-01** | Android Phone HMI | 純 Kotlin 協定模組單元測試 | `gradlew :protocol:test` | JUnit 全部通過，7 大 ASCII 指令與 19-Bit 解析 100% 正確 | **NOT RUN** | 本次僅治理升級，尚未執行 Gradle 測試 |
| **V-AND-02** | Android Phone HMI | Android App 構建發布 | `gradlew :app:assembleRelease` | 生成 release APK，各 SDK 依賴解析正常 | **NOT RUN** | 待模組更動時構建 |
| **V-WPF-01** | PC Laptop HMI | WPF 方案編譯構建 | `dotnet build pc-laptop-hmi/Ntu1200Hmi.csproj` | 編譯成功無錯誤，生成可執行檔 | **NOT RUN** | 待桌面模組更動時構建 |
| **V-WPF-02** | PC Laptop HMI | 獨立單一 EXE 封裝驗證 | 檢查 `publish/NTU1200_HMI.exe` | 檔案完整且具備自動探測 COM 埠功能 | **NOT RUN** | 待桌面實機環境測試 |
| **V-ESP-01** | ESP32-S3 HMI | PlatformIO 韌體編譯 | `pio run -d esp32-s3-hmi` | ESP-IDF / Arduino 核心編譯成功，LVGL 8.3 連結無誤 | **NOT RUN** | 待嵌入式環境編譯 |
| **V-HW-01** | 實體硬體全模式 | NTU-1200 實機唯讀長期連線 | 連接 MOXA TCC-82 + RJ11，連續輪詢 48 小時 | 通訊成功率 $>99.9\%$，零丟包無中斷 | **BLOCKED** | 無實體逆變器與隔離硬體台架連線 |

---

## 二、 驗證狀態統計

- **已通過 (`PASS`)**：3 項（治理與 Git 規範驗證）
- **未執行 (`NOT RUN`)**：9 項（軟體與前端靜態/功能測試骨幹）
- **環境受限 (`BLOCKED`)**：1 項（需實體逆變器台架）
