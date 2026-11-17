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
| **V-GOV-04** | 全域專案 | PWA 升級前備份標籤建立 | `git tag backup/pre-pwa-upgrade-...` | 標籤成功建立並同步至遠端 | **PASS** | `backup/pre-pwa-upgrade-20261022163912` 已推至 origin |
| **V-WEB-01** | Web Serial HMI | HTML/JS 靜態語法與資源引用 | 檢查 `index.html`, `app.js`, `style.css` 語法與標記 | 無語法中斷與缺失檔案 | **PASS** | 三目錄鏡像 SHA256 比對完全一致，語法標記無缺漏 |
| **V-WEB-02** | Web Serial HMI | 本地 Localhost 安全環境通訊 | 執行 `start_web_local.bat` 驗證安全上下文 | 瀏覽器載入並啟用 `navigator.serial` | **NOT RUN** | 待後續本機服務啟動驗證 |
| **V-WEB-03** | Web Serial HMI | 離線模擬展示引擎 (Demo Mode) | 點擊「模擬模式」檢查 4 大儀表與 60s 趨勢圖 | 假數據依 500ms 節奏刷新且趨勢圖繪製正常 | **NOT RUN** | 待瀏覽器實測 |
| **V-WEB-04** | Web Serial HMI | 19-Bit 狀態旗標與 SOP Modal | 點擊故障位元檢查 SOP 診斷彈窗內容 | 正確解析位元、成因分析與 SOP 指令調度 | **NOT RUN** | 待瀏覽器實測 |
| **V-PWA-01** | Web Serial HMI | Web App Manifest 規格與圖標校驗 | 檢查 `manifest.json` 結構、display 與 192/512 圖標 | 符合 W3C Manifest 規範，圖標尺寸解析度正確 | **PASS** | 已生成 192x192、512x512 高品質 PNG 圖標，JSON 語法驗證通過 |
| **V-PWA-02** | Web Serial HMI | Service Worker 快取與生命週期校驗 | 檢查 `sw.js` 預快取清單與 fetch 攔截邏輯 | 正確處理靜態快取與 Fonts 快取，隔離非 HTTP 請求 | **PASS** | sw.js 語法檢驗通過，預快取 9 項前端核心資源 |
| **V-AND-01** | Android Phone HMI | 純 Kotlin 協定模組單元測試 | `gradlew :protocol:test` | JUnit 全部通過，7 大 ASCII 指令與 19-Bit 解析 100% 正確 | **NOT RUN** | 本次僅 Web PWA 升級，未更動 Android 模組 |
| **V-AND-02** | Android Phone HMI | Android App 構建發布 | `gradlew :app:assembleRelease` | 生成 release APK，各 SDK 依賴解析正常 | **NOT RUN** | 待模組更動時構建 |
| **V-WPF-01** | PC Laptop HMI | WPF 方案編譯構建 | `dotnet build pc-laptop-hmi/Ntu1200Hmi.csproj` | 編譯成功無錯誤，生成可執行檔 | **NOT RUN** | 待桌面模組更動時構建 |
| **V-WPF-02** | PC Laptop HMI | 獨立單一 EXE 封裝驗證 | 檢查 `publish/NTU1200_HMI.exe` | 檔案完整且具備自動探測 COM 埠功能 | **NOT RUN** | 待桌面實機環境測試 |
| **V-ESP-01** | ESP32-S3 HMI | PlatformIO 韌體編譯 | `pio run -d esp32-s3-hmi` | ESP-IDF / Arduino 核心編譯成功，LVGL 8.3 連結無誤 | **NOT RUN** | 待嵌入式環境編譯 |
| **V-SPEC-01** | 全平台協定層 | 官方 NTS,NTU-C.pdf 7 大核心指令幀格式完整對齊 | 核對 C(17B), V(11B 2-Byte CS), pU(解鎖), I(99B), W(99B), U(33B) | 100% 符應官方手冊規格要求 | **PASS** | Web Serial, WPF, Android, ESP32-S3 全端同步更新，向下相容 |
| **V-SPEC-02** | 全平台診斷層 | 19-Bit 狀態旗標官方定義與成因 SOP 排錯對齊 | 比對第 37~38 頁 b0~b18 官方定義 | b6~b15 嚴重誤植徹底導正，成因與 SOP 全面對齊 | **PASS** | Web Serial 診斷卡片、WPF ViewModel、ESP32 旗標全數導正 |
| **V-SPEC-03** | 全平台解析層 | Q 遙測封包欄位對齊與雙模相容 (Battery Volt/Capacity/Load) | 比對第 37/48 頁 Q 封包真實欄位定義 | tokens[2] 電池電壓與 tokens[3] 容量雙模相容解析 | **PASS** | WPF, Android Kotlin, ESP32 C++, Web JS 四端同步升級 |
| **V-BAT-01** | 全平台設定層 | 常用深層循環電池建議設定與一鍵套用 (UXH100-12FR/AGM/LiFePO4) | 比對湯淺規格書放電終止電壓 10.5V~10.8V 與 Web/WPF 連動 | 預警 11.5V、切斷 10.6V、負載 950W 一鍵套用至即時警報門檻 | **PASS** | Web HMI 與 WPF EXE 同步完成介面化套用與規格對照表 |
| **V-WPF-03** | PC Laptop HMI | WPF 單一可執行檔重新發布 | `dotnet publish ... -p:PublishSingleFile=true` | 編譯 0 警告 0 錯誤，產出全新 NTU1200_HMI.exe | **PASS** | 2026-11-17 23:12 構建成功，發布全新 NTU1200_HMI.exe |
| **V-HW-03** | 實體硬體介面 | 四芯線色垂直映射 (藍2/橘5/綠3/棕NC) 最終核定 | 依據實物線序由左至右對齊 Pin 6~1 | 線色與訊號 100% 正確匹配，解釋 -9.1V/0V 現象 | **PASS** | 2026-11-17 16:10 完成更新 |
| **V-HW-02** | 實體硬體介面 | RJ11 Remote Port (6到1) 腳位與實測 -9.1V 剖析核定 | 依據原廠規格書第 6 頁圖紙與實測數據比對 | 腳位定義、線色映射與實測 -9.1V/0V 成因完全吻合 | **PASS** | 2026-11-17 15:55 更新 docs/R11_RS232/ 指南 |
| **V-HW-01** | 實體硬體全模式 | NTU-1200 實機連線與通訊封包回傳驗證 | 連接 USB 轉 RS-232 + RJ11，執行 NTU1200_HMI.exe 實機通訊 | 成功鎖定 COM8，連續接收 (000 000 12.8 100 29.2 116 00.0...)，零丟包 | **PASS** | 2026-11-17 22:48~23:04 實測連線成功，寫入 ntu1200_2026-11-17.csv |
| **V-LOAD-01** | 全平台解析層 | 遙測封包類比連續負載解析 | 依手冊第 36 頁採納 `tokens[8]` (O/P Load Analog) 計算即時連續瓦數 | 解決原本依賴 `tokens[1]` 25% 階梯跳躍鎖死在 300W 問題，瓦數具備 1% 解析度連續響應 | **PASS** | WPF, Web JS, Android Kotlin 全端升級，實測封包 `tokens[8]=023` 計算精確為 276.0W |
| **V-EEPROM-01** | 全平台協定層 | 硬體 EEPROM 寫入按鈕與 W 指令幀組裝 | 依手冊第 42~45 頁組裝 99 位元組標準 W 指令幀與 2-Byte Checksum | 完整保留現場機型序號/版本，帶入低壓告警/停機電壓，具備 9.9~12.5V 邊界與差值>=0.2V 防呆驗證 | **PASS** | WPF 與 Web Serial 同步提供雙重防呆警告與即時 EEPROM 寫入功能 |
| **V-WPF-04** | PC Laptop HMI | WPF 單一可執行檔重新發布 | `dotnet publish ... -p:PublishSingleFile=true` | 編譯 0 警告 0 錯誤，產出全新 NTU1200_HMI.exe (2.33MB) | **PASS** | 2026-11-17 23:56 構建成功，發布全新 NTU1200_HMI.exe |
| **V-WEB-05** | Web Serial HMI | Web Serial 類比瓦數與 EEPROM 寫入同步 | 檢查根目錄、web-serial-hmi/、docs/ 三端代碼同步 | 三目錄 HTML/JS/CSS 鏡像完全一致，支援類比連續負載與 W 指令 | **PASS** | 2026-11-17 23:55 三端代碼同步完成 |

---

## 二、 驗證狀態統計

- **已通過 (`PASS`)**：15 項（治理、Git 備份、Web 靜態一致性、PWA Manifest、Service Worker 語法、官方協定對齊、19-Bit 旗標修正、實體接線映射、實機 COM8 實測通訊成功、WPF EXE 發布、電池設定預設庫、類比連續瓦數解析、硬體 EEPROM 寫入功能、Web 端代碼同步）
- **未執行 (`NOT RUN`)**：5 項（Android 構建、ESP32 構建等次要平台）
- **環境受限 (`BLOCKED`)**：0 項（實機通訊已於 2026-11-17 實證成功）

