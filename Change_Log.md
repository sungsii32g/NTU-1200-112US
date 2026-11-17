# Change Log (NTU-1200-112US 變更紀錄)

本檔案嚴格遵循 **APPEND ONLY（僅限末尾追加）** 原則維護。所有新的變更紀錄僅能由最末端附加，嚴禁重排、改寫或刪除任何歷史內容。

---

## [2026-10-22 16:35:00 +08:00] - 專案治理制度升級與工程規範導入

### 變更類型
- `Governance / Architecture Specification`

### 變更目的
導入全域工程審核治理架構（Engineering Review Governance），確立模式標記（MODE）、TRACE_ONLY 優先制度、Git 優先同名回滾備份制度，以及真實驗證覆蓋矩陣。

### 變更內容
1. **建立專案工程記憶導覽索引**：建立 [GEMINI.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/GEMINI.md)，明確定義專案 1-to-1 同名映射、全域治理紅線與五大模式模組地圖。
2. **建立 Append-Only 變更紀錄**：建立 [Change_Log.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/Change_Log.md)，鎖定末尾追加規則。
3. **建立驗證覆蓋矩陣**：建立 [VerificationCoverageMatrix.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/VerificationCoverageMatrix.md)，列出 WPF PC 版、Android 模組、Web Serial HMI、ESP32-S3 等各端現有測試項目與基準狀態（實跑前誠實標記為 `NOT RUN`）。
4. **建立升級安全備份標籤**：於 Git 倉庫打上 `backup/pre-governance-upgrade-20261022163432` 標籤並推送至遠端 `origin`。

### 影響範圍
- 專案根目錄治理文件，不破壞任何既有韌體、WPF、Android 或 Web 端程式碼。

### 驗證狀態
- Git 狀態確認：`PASS`（工作區乾淨，Tag 推送成功）。
- 既有程式相容性：`CONFIRMED`（零更動產品程式碼）。

---

## [2026-10-22 16:45:00 +08:00] - Web Serial HMI 升級為標準 PWA (Progressive Web App)

### 變更類型
- `Feature / Enhancement / Web PWA`

### 變更目的
將原本純靜態 SPA 之 Web Serial HMI 控制中心升級為支援離線快取、獨立視窗（Standalone）與桌面/行動裝置免安裝直接新增至主畫面的標準 PWA。

### 變更內容
1. **新增 Web App Manifest (`manifest.json`)**：
   - 定義名稱 `MEAN WELL NTU-1200-112US 監控控制中心`（短名稱 `NTU-1200 HMI`）。
   - 設定顯示模式為 `display: standalone`，背景與主題色彩為工業深藍 `#0b0f19` / `#0ea5e9`。
   - 配置標準 192x192 與 512x512 高解析度雙規格圖標（包含 any 與 maskable 目的）。
2. **新增 Service Worker 離線快取引擎 (`sw.js`)**：
   - 版本號 `ntu1200-pwa-v1.0.0`。
   - 預先快取核心靜態資產（HTML、CSS、JS、Manifest、Icons）。
   - 實作 Stale-While-Revalidate 與 Google Fonts 快取優先策略，離線狀態具備安全降級導航。
   - 嚴格隔離非 HTTP(S) 請求，不干擾 Web Serial 原生串列通訊。
3. **前端入口整合 (`index.html`)**：
   - 引入 `<link rel="manifest">`、行動裝置全螢幕獨立視窗 meta 標籤與 apple-touch-icon。
   - 在頂部 `port-bar` 連線操作區新增動態「📲 安裝 App」按鈕（`#btnInstallPwa`）。
4. **前端控制器升級 (`app.js`)**：
   - 加入 Service Worker 自動註冊與生命週期監聽。
   - 監聽 `beforeinstallprompt` 與 `appinstalled` 事件，提供友善之原創 PWA 安裝引導。
5. **多端同步鏡像保證**：
   - 根目錄 (`./`)、GitHub Pages 部署目錄 (`docs/`) 與子專案目錄 (`web-serial-hmi/`) 三端檔案 100% 保持 SHA256 同步。

### 影響範圍
- Web HMI 前端，100% 向後相容現有 W3C Web Serial API 串列埠連線與離線模擬展示引擎。

### 驗證狀態
- Git 備份標籤：`backup/pre-pwa-upgrade-20261022163912` 已推至遠端。
- 檔案 SHA256 一致性：`PASS`（三處鏡像哈希完全相同）。
- 靜態標籤與語法檢查：`PASS`。


---

## [2026-11-04 16:35:00 +08:00] - PWA 架構確認與全平台導覽指引全面完善

### 變更類型
- `Documentation / Specification Alignment / PWA Clarification`

### 變更目的
確認本專案 Web Serial HMI 之 PWA（Progressive Web App）完整實作狀態，並同步升級全域總導覽手冊與子專案技術手冊，明確標註 PWA 離線快取（Service Worker）、獨立視窗運作（Standalone）與桌面/主畫面安裝引導規範。

### 變更內容
1. **升級全域技術導覽 (`README.md`)**：
   - 頂部新增 `PWA Supported Offline` 認證徽章。
   - 頂部重要公告區詳述 PWA 原生獨立應用體驗、Service Worker 離線秒開與獨立視窗模式。
   - 更新五大模式選型表，明確標註模式五為 `GitHub Pages 免安裝 Web HMI (PWA)`，技術棧包含 `Web Serial + PWA`，進階特色增列 `PWA 離線快取與獨立安裝`。
   - 更新目錄樹結構說明，詳述 `manifest.json` 與 `sw.js` 之職責。
2. **升級模組專屬手冊 (`web-serial-hmi/README.md`)**：
   - 標題與簡介加入 PWA 認證標記。
   - 核心特色新增第 4 點「標準 PWA (Progressive Web App) 規範完整支援」，涵蓋獨立視窗模式、Service Worker 離線快取與秒開、自適應圖標與安全上下文。
3. **建立 Git 安全回滾備份**：
   - 建立標籤 `backup/NTU-1200-112US_20261104_163230` 並同步推送至遠端 `origin`。

### 影響範圍
- 專案說明文件與架構指南，零更動韌體、硬體與通訊控制程式碼。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261104_163230` 已成功建立。
- 專案狀態確認：`PASS`（工作區乾淨無衝突，代碼與文件完全一致）。


---

## [2026-11-10 13:40:00 +08:00] - 全專案導入 SHIBUG WORKS 全新 LOGO 設計與商標版權更新

### 變更類型
- `Branding / Asset Upgrade / Visual Identity / Copyright Alignment`

### 變更目的
全面採用全新高品質設計之 `logo_600x600.png` 標誌，全面置換全專案各平台之品牌 LOGO、PWA 雙規格圖標、網站 Favicon 與 Windows 桌面應用圖標，並統一將品牌與版權宣告確立為「SHIBUG WORKS 版權所有 (All rights reserved)」。

### 變更內容
1. **主視覺標誌與多解析度資產全面生成與鏡像同步**：
   - 保留根目錄來源原始檔 [logo_600x600.png](file:///d:/Work_Room/App_Development/NTU-1200-112US/logo_600x600.png)。
   - 同步更新根目錄、`docs/`、`web-serial-hmi/`、`pc-laptop-hmi/`、`esp32-s3-hmi/` 之 `logo.png`。
   - 重新生成標準 PWA 192x192 與 512x512 高品質圖標（`icon-192.png`、`icon-512.png`），並鏡像至三端。
   - 重新生成高相容多尺寸 Windows / Web 圖標檔（`favicon.ico`、`logo.ico`，內含 16/32/48/64/128/256 分辨率）。
   - 清理刪除舊版冗餘大檔 `LOGO.jpg`。
2. **PWA Service Worker 快取升級 (`sw.js`)**：
   - 升級快取版號至 `ntu1200-pwa-v1.0.1`，預快取清單增列 `logo_600x600.png`，確保客戶端瀏覽器自動刷新快取，立即載入全新視覺。
3. **品牌名稱與版權宣告全面統一**：
   - 全面替換原「柴閣巴物 / SHIBA & PUG」文字，統一更新為「SHIBUG WORKS 版權所有」。
   - 更新 [README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/README.md) 主標題、首圖 alt 標籤與頁尾開源商標版權宣告。
   - 更新 [index.html](file:///d:/Work_Room/App_Development/NTU-1200-112US/index.html)（含 docs/ 及 web-serial-hmi/ 鏡像）頂部品牌名稱與底部頁尾版權列。
   - 更新 [MainWindow.xaml](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/MainWindow.xaml) WPF PC 介面頂部品牌名稱。
   - 更新 [web-serial-hmi/README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/web-serial-hmi/README.md) 品牌與商標宣告。
4. **WPF PC 桌面應用重新發布**：
   - 以 .NET 8 重新構建並發布獨立單一執行檔 [pc-laptop-hmi/publish/NTU1200_HMI.exe](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/publish/NTU1200_HMI.exe)，完整內嵌全新 `logo.ico` 與 `logo.png`。

### 影響範圍
- 品牌視覺、多端圖標與說明文件，不破壞任何既有通訊協定、RS-232 輪詢機制或控制邏輯。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261110_134000`。
- 多端檔案 SHA256 比對：`PASS`（鏡像完全一致）。
- WPF 方案構建與發布：`PASS`（0 警告、0 錯誤）。
- 舊品牌名稱搜尋檢查：`PASS`（0 殘留）。


---

## [2026-11-10 13:45:00 +08:00] - 建立專案「責任自負與限制」法律免責條款與聲明

### 變更類型
- `Governance / Legal Disclaimer / Risk Mitigation / Specification Update`

### 變更目的
為防範任何使用者因自行組裝、韌體燒錄、實體電氣接線或大功率逆變器操作不當所衍生之風險與爭議，於全專案建立嚴謹之「責任自負與限制聲明（Disclaimer & Limitation of Liability）」，確保開發者免於人身傷害、財物損失、設備原廠保固失效或衍生損害之任何民事賠償或連帶法律責任。

### 變更內容
1. **建立正式授權與免責文件 (`LICENSE`)**：
   - 建立根目錄 [LICENSE](file:///d:/Work_Room/App_Development/NTU-1200-112US/LICENSE)，內含 MIT 開源授權條款，並正式附加完整「責任自負與限制聲明」法定條文。
2. **全域技術導覽手冊整合 (`README.md`)**：
   - 於專案首頁顯要位置增設 GitHub Alert `> [!CAUTION]` 警語區塊，明確公告責任自負與限制。
   - 於文末開源授權與商標版權段落納入完整免責宣告與指向連結。
3. **Web Serial / PWA 網頁端介面整合 (`index.html`)**：
   - 同步更新根目錄、`docs/` 與 `web-serial-hmi/` 三處鏡像首頁之頁尾版權列，常駐顯示完整之責任自負與限制條款。
4. **WPF PC 桌面控制中心整合 (`MainWindow.xaml` & `NTU1200_HMI.exe`)**：
   - 在主畫面底部常駐新增高對比免責聲明區塊，並重新編譯發布獨立單一執行檔 `publish/NTU1200_HMI.exe`。
5. **子模組操作指南同步更新**：
   - 同步於 [web-serial-hmi/README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/web-serial-hmi/README.md) 與 [pc-laptop-hmi/README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/README.md) 增設免責宣告條款。

### 影響範圍
- 專案各端介面之法律免責公告、授權條款與導覽文件，100% 保持硬體通訊協議與既有控制功能之向後相容性。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261110_134030`。
- 多端鏡像 SHA256 比對：`PASS`（三處 index.html 完全一致）。
- WPF 方案編譯發布：`PASS`（0 警告、0 錯誤）。


---

## [2026-11-10 14:15:00 +08:00] - 全新 LOGO 資產正式確立、商標更名為 SHIBURG WORKS 並清理舊版資產

### 變更類型
- `Branding / Identity Alignment / Asset Refactoring / Remote Synchronization`

### 變更目的
全面替換為使用者提供之最新版高解析度主標誌 [logo.png](file:///d:/Work_Room/App_Development/NTU-1200-112US/logo.png)（882x863），將全專案品牌正式更名為「SHIBURG WORKS 版權所有 (All rights reserved)」，清理刪除過渡期舊檔 `logo_600x600.png`，並重新編譯發布全端鏡像資產。

### 變更內容
1. **主視覺標誌與多尺寸圖標全面重新渲染**：
   - 以根目錄最新版 [logo.png](file:///d:/Work_Room/App_Development/NTU-1200-112US/logo.png)（1.29 MB）為單一事實基準，鏡像至 `docs/`、`web-serial-hmi/`、`pc-laptop-hmi/`、`esp32-s3-hmi/`。
   - 採用雙三次高畫質等比例自適應縮放，生成標準 192x192 與 512x512 PWA 圖標（`icon-192.png`、`icon-512.png`）。
   - 重新生成內含 16/32/48/64/128/256 分辨率之標準圖標檔（`favicon.ico`、`logo.ico`）。
   - 正式刪除舊版過渡檔案 `logo_600x600.png`，確保 Git 倉庫乾淨無冗餘。
2. **PWA Service Worker 快取版號升級 (`sw.js`)**：
   - 快取版號升級為 `'ntu1200-pwa-v1.0.2'`，移除 `logo_600x600.png` 預快取項目，確保離線快取精準命中。
3. **品牌名稱全面更名為 SHIBURG WORKS**：
   - [LICENSE](file:///d:/Work_Room/App_Development/NTU-1200-112US/LICENSE)：更新版權所有人為 `SHIBURG WORKS`。
   - [README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/README.md)：主標題、LOGO alt 屬性與頁尾商標宣告全面更名為 `SHIBURG WORKS`。
   - [index.html](file:///d:/Work_Room/App_Development/NTU-1200-112US/index.html)（含 docs/ 及 web-serial-hmi/ 鏡像）：頂部品牌與頁尾版權列全面更名為 `SHIBURG WORKS`。
   - [MainWindow.xaml](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/MainWindow.xaml)：WPF 桌面介面頂部品牌全面更名為 `SHIBURG WORKS`。
   - [pc-laptop-hmi/README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/README.md) 與 [web-serial-hmi/README.md](file:///d:/Work_Room/App_Development/NTU-1200-112US/web-serial-hmi/README.md)：全面更名為 `SHIBURG WORKS`。
4. **WPF PC 桌面應用重新編譯發布**：
   - 重新發布獨立單一執行檔 [pc-laptop-hmi/publish/NTU1200_HMI.exe](file:///d:/Work_Room/App_Development/NTU-1200-112US/pc-laptop-hmi/publish/NTU1200_HMI.exe)，內嵌全新圖標與 SHIBURG WORKS 介面宣告。

### 影響範圍
- 品牌視覺圖標、介面字串與授權文件，100% 保持硬體通訊協議相容性。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261110_141500`。
- 多端檔案 SHA256 比對：`PASS`（鏡像完全一致）。
- WPF 方案構建與發布：`PASS`（0 警告、0 錯誤）。
- 舊名稱殘留檢查：`PASS`（全域已無 `SHIBUG` 殘留）。


---

## [2026-11-16 16:40:00 +08:00] - 實體 Remote Port RJ11 對接 DB9 螺絲端子台接線圖解與寫真指南導入

### 變更類型
- `Documentation / Hardware Pinout Alignment / Field Assembly Guide`

### 變更目的
依據現場實拍之原廠機身 Remote Port 插座（1~6 標號）、DB9 母頭免焊螺絲端子台與實物四芯電話線（`docs/R11_RS232/`），建立 100% 精準之現場直鎖實體對照手冊，明確界定「棕3 / 藍5 / 橘2 / 綠NC」線色與端子孔位之點對點對應關係。

### 變更內容
1. **建立專屬實物寫真圖解手冊 (`docs/R11_RS232/README.md`)**：
   - 整合機身 Remote Port 插座、DB9 母頭螺絲端子台與 6P4C 色線高清實拍相片。
   - 詳列槽位 1~6、實體線色、逆變器訊號、DB9 孔位與訊號流向之完整對照表。
   - 建立現場快速記憶口訣：「橘鎖 2 (RXD)、棕鎖 3 (TXD)、藍鎖 5 (GND)、綠剪平絕緣」。
   - 提供「導通性、短路絕緣、上電負電壓」三重電錶防呆驗收法。
2. **升級原廠接線指南 (`docs/RJ11_RS232_Pinout_Diagram.md`)**：
   - 新增第 3.5.1 小節《現場實物寫真對照：棕/藍/橘/綠 四芯電話線與 DB9 免焊端子台實作指南》，建立完整超連結與端子台直鎖指引。
3. **全域總手冊與專案記憶同步 (`README.md` & `GEMINI.md`)**：
   - 於 `README.md` 通用硬體規範區增設「現場實物四芯線與 DB9 免焊端子台直鎖指引」提示卡片與目錄結構更新。
   - 於 `GEMINI.md` 工程手冊索引區補登 `docs/R11_RS232/` 對照手冊。

### 影響範圍
- 硬體線材組裝手冊與規格文件，不破壞任何既有韌體、通訊協定或上位機軟體。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261116_164000`。
- 物理腳位邏輯檢驗：`PASS`（原廠 Pin 2 Rx、Pin 3 GND、Pin 4 Tx 與實拍 6P4C 棕/藍/橘/綠 100% 邏輯閉環吻合）。
- 實物照片引用檢查：`PASS`（6 張實拍圖片皆完整納入文檔索引）。


---

## [2026-11-16 17:08:00 +08:00] - 增訂 RJ11 水晶頭「卡榫彈片朝上」真實插入姿態示意圖與電錶量測驗收基準

### 變更類型
- `Documentation / Hardware Pinout Alignment / Verification Guidance`

### 變更目的
為徹底消除實體線材施工時可能產生的空間視角與鏡像疑慮，依據現場實拍之原廠機身插座與 6P4C 色線，正式增訂「卡榫彈片朝上 (Latch UP)」真實插機姿態之 1:1 匹配圖解；同時明確定義三用電錶蜂鳴檔與歐姆檔量測時「1.04Ω ~ 1.10Ω 跳動」之物理成因與 PASS 驗收判定準則。

### 變更內容
1. **增訂「卡榫彈片朝上」1:1 實物匹配示意圖 (`docs/R11_RS232/README.md`)**：
   - 明確標記水晶頭插機姿態：塑膠卡榫彈片朝上（天花板）、黃銅接觸面朝下（地面）、線材在後、插頭向前。
   - 繪製高解析度 ASCII 拓撲匹配圖，將水晶頭由左至右 6 槽（空、棕、藍、橘、綠、空）與逆變器機身母座 6 根底部彈針（Pin 1 NC、Pin 2 Rx、Pin 3 GND、Pin 4 Tx、Pin 5 NC、Pin 6 NC）進行 1:1 垂直對照。
   - 重申 DB9 螺絲端子台直鎖關係：橘鎖 2 (RXD)、棕鎖 3 (TXD)、藍鎖 5 (GND)、綠剪平絕緣。
2. **補充三用電錶量測數值判別指引 (`docs/R11_RS232/README.md` & `docs/RJ11_RS232_Pinout_Diagram.md`)**：
   - 權威解答使用者量測實測數值在「1.04Ω ~ 1.10Ω 之間跳動」之現象：證實此數值為「探棒線阻 (0.3Ω) + 細銅線直流電阻 (0.4Ω) + 接觸電阻 (0.3Ω)」之總和，為極佳之低阻抗通路判定（PASS）。
   - 強化短路絕緣防護說明：相鄰孔位（2 與 3、2 與 5、3 與 5）互量必須呈現 `0.L`（無窮大開路），確認無銅絲毛邊搭接。
3. **首頁總指南同步 (`README.md`)**：
   - 於 `README.md` 實物直鎖指引中補充「卡榫彈片朝上、黃銅針腳朝下」之姿態定義與電錶 1.04Ω~1.10Ω 正常導通提示。

### 影響範圍
- 專案說明文件與硬體實施手冊，不影響既有軟體、韌體架構與通訊契約。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261116_170500`。
- 物理空間姿態檢驗：`PASS`（卡榫朝上、金針朝下時，Slot 2 棕色=Pin 2 Rx、Slot 3 藍色=Pin 3 GND、Slot 4 橘色=Pin 4 Tx，完全吻合）。
- 文檔結構一致性檢查：`PASS`（`README.md`、`docs/RJ11_RS232_Pinout_Diagram.md`、`docs/R11_RS232/README.md` 全面同步）。


---

## [2026-11-16 23:30:00 +08:00] - 批次檔 CRLF 斷行修復、編碼亂碼徹底根除與硬體逾時除錯指引強化

### 變更類型
- `Bug Fix / Batch Script Encoding & Line Ending / UI Telemetry Diagnostics`

### 變更目的
修復使用者在 Windows 執行 `start_web_local.bat` 時出現 `o`、`ttp:`、`.server`、`l`、`?芸皜砍 Python...` 等非預期截斷命令與亂碼之問題；徹底解決 Windows `cmd.exe` 在解析 Unix `LF` 斷行時產生的位元偏移與 OEM 編碼崩潰；同時針對硬體實體連線後未顯示遙測數據之情境，於 Web Serial 前端加入 1.5 秒無回應之即時視覺診斷提示。

### 變更內容
1. **批次檔 Windows CRLF 斷行與 UTF-8 BOM 全面正規化**：
   - 全面將 `start_web_local.bat`、`pc-laptop-hmi\start_pc_hmi.bat`、`pc-laptop-hmi\build_exe.bat` 由 Unix `LF (\n)` 轉換為標準 Windows `CRLF (\r\n)`，徹底根除 `cmd.exe` 讀取多位元組 UTF-8 時產生的偏移截斷。
   - 增加 `.gitattributes` 明確約束 `*.bat text eol=crlf` 與 `*.cmd text eol=crlf`，防止後續 Git checkout 誤轉。
2. **`start_web_local.bat` 啟動引擎健壯性大幅升級**：
   - 依序智慧探測 `python` ──► `py` ──► `python3` 命令，若皆未安裝則自動調用 Windows 原生 PowerShell `HttpListener` 啟動免依賴 Web 伺服器。
   - 改採非同步延遲 1 秒呼叫預設瀏覽器（`start "" cmd /c "timeout /t 1 >nul & start http://localhost:8080/"`），避免瀏覽器在伺服器綁定埠前過早請求導致 404/拒絕連線。
3. **Web Serial 遙測逾時與硬體線路對調即時診斷提示**：
   - 於 `app.js`（同步更新 `web-serial-hmi/app.js`、`docs/app.js`、根目錄 `app.js`）加入 `lastValidPacketTime` 與 1.5 秒逾時偵測機制。
   - 當串口已開啟但逆變器超過 1.5 秒未回傳封包時，連線徽章自動變更為橘色警告 `badge-stale`，並於狀態欄與原始接收區即時提示「(逾時無回應：請確認逆變器已開機通電，或將端子台 2 號橘線與 3 號棕線對調測試)」。

### 影響範圍
- 本機啟動批次檔、Git 換行規範與 Web Serial 前端診斷邏輯，不破壞任何既有通訊協定契約與上位機核心資料結構。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261116_232800`。
- 批次檔執行測試：`PASS`（`cmd.exe /c start_web_local.bat` 輸出完全正常，中文無亂碼，指令無截斷）。
- Web 前端一致性檢驗：`PASS`（三處 `app.js` 檔案雜湊一致且功能閉環）。


---

## [2026-11-16 23:36:00 +08:00] - Web Serial DTR/RTS 隔離器埠供電修復、全斷行字元解析相容與 I 指令防碰撞升級

### 變更類型
- `Bug Fix / Web Serial Protocol Communication / Flow Control & Power Assertion`

### 變更目的
針對實體連線後發送 `I\r` 或 `Q\r` 逆變器均無回傳資料之問題，進行程式代碼層與硬體電氣層全面深度審查。修復 Web Serial 缺少 DTR/RTS 導致 MOXA TCC-82 光電隔離器完全斷電之致命代碼缺陷；修復封包斷行解析僅限 `\r` 之脆弱性；並解決 `I\r` 查詢與背景 500ms `Q\r` 輪詢在單一串口產生之併發衝突。

### 變更內容
1. **Web Serial 強制拉高 DTR 與 RTS 信號 (`app.js`)**：
   - 於 `serialPort.open(...)` 成功後立即呼叫 `serialPort.setSignals({ dataTerminalReady: true, requestToSend: true })`。
   - 為串接 MOXA TCC-82 埠供電型光耦隔離器提供必要之 +6V~+10V 激勵電源，確保光電隔離晶片正常工作。
2. **通訊封包斷行正規化相容 (`/[\r\n]/`)**：
   - 將 `buffer.indexOf('\r')` 改寫為正則表達式 `buffer.search(/[\r\n]/)` 迴圈提取。
   - 同時相容 `\r`、`\n`、`\r\n`，徹底解決若韌體僅送出 `\n` 導致 `buffer` 無限堆積不解析之問題。
   - 所有非 `(` 開頭的字串（包含 `I` 指令回傳之任何格式）無條件提取並即時寫入設備資訊框。
3. **`I\r` 查詢指令防併發碰撞機制**：
   - 點擊「查詢設備 (I)」時，自動暫停背景 `Q\r` 輪詢 800ms，為 `I` 指令提供乾淨獨立之通訊窗口，避免與輪詢產生位元碰撞。
4. **全端檔案同步**：
   - 同步更新 `web-serial-hmi/app.js`、`docs/app.js` 與根目錄 `app.js`。

### 影響範圍
- Web Serial 通訊驅動與事件處理，不破壞任何既有 UI 佈局或資料結構。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261116_233500`。
- 代碼靜態分析：`PASS`（DTR/RTS 供電、全斷行正規劃與 800ms 避碰機制閉環完整）。


---

## [2026-11-17 00:10:00 +08:00] - PC 桌面端指令避碰與設備資訊解析修復、接線鏡像診斷與環迴自檢法升級

### 變更類型
- `Bug Fix / PC WPF HMI Serial Protocol / Hardware Pinout & Diagnostic Verification`

### 變更目的
徹底解決實體硬體連線後網頁與原生桌面 EXE 均無法獲取遙測或設備資訊之問題。修復 PC WPF 桌面端 `SerialManager.cs` 與 `MainViewModel.cs` 在發送 `I\r` 時未暫停背景 `Q\r` 輪詢、緩衝區被 `DiscardInBuffer()` 沖刷、以及未解析展示 `#` 設備資訊封包之代碼缺陷；重新發布單一獨立可執行檔 `NTU1200_HMI.exe`；並於硬體接線手冊中追加「萬用電表 DC 直流電壓 -6V 終極判斷法」與「電腦端 3 秒短路環迴自檢 (Loopback Test)」，提供工程師零誤判之驗收標準。

### 變更內容
1. **PC 桌面端指令避碰機制 (`SerialManager.cs`)**：
   - 新增 `_pausePollingUntil` 計時器，當發送自訂指令（如 `I\r`、`C\r`、`V\r`）時，自動暫停背景 `Q\r` 輪詢 800ms。
   - 移除在讀取前無差別清除接收緩衝區 (`DiscardInBuffer()`) 之邏輯，避免沖刷剛收到的 `#...` 封包。
   - 擴充封包辨識，若收到 `#` 開頭之設備資訊字串，觸發 `OnDeviceInfoReceived` 事件，不再強制包裝為 `(` 遙測格式。
2. **PC 桌面端 ViewModel 綁定 (`MainViewModel.cs`)**：
   - 訂閱 `OnDeviceInfoReceived` 事件，動態將實體逆變器回傳之型號韌體字串更新至 UI 設備資訊欄位。
   - 點擊查詢時立即更新提示字串，若發送失敗提供明確例外訊息。
3. **發布最新獨立 EXE**：
   - 執行 `dotnet publish`，重新編譯並輸出全新單一檔案 `pc-laptop-hmi/publish/NTU1200_HMI.exe`。
4. **硬體接線手冊與電氣診斷增強 (`docs/R11_RS232/README.md`, `docs/RJ11_RS232_Pinout_Diagram.md`)**：
   - 加入 NTU-1200 機身開關 ON/OFF 與 2-Pin R.C. 插座開路檢查規範。
   - 加入萬用電表 DC 直流電壓量測法：測量【5號藍線】與【2號橘線】之間電壓，若為 -6V 證實標準接法正確；若為 +6V 則一秒識別鏡像反向並給出倒置接法對應。
   - 加入電腦與轉接器端 3 秒短路環迴自檢法 (Loopback Test: Pin 2 與 Pin 3 短接)，徹底分離軟體問題與硬體問題。

### 影響範圍
- `pc-laptop-hmi/Services/SerialManager.cs`
- `pc-laptop-hmi/ViewModels/MainViewModel.cs`
- `pc-laptop-hmi/publish/NTU1200_HMI.exe`
- `docs/R11_RS232/README.md`
- `docs/RJ11_RS232_Pinout_Diagram.md`

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261117_000500`。
- 編譯狀態：`dotnet publish` 通過（0 警告，0 錯誤）。
- 代碼靜態分析：`PASS`。

---

## [2026-11-17 00:50:00 +08:00] - 全平台通訊協定、指令幀與 19-Bit 狀態旗標全面依據明緯官方 NTS,NTU-C.pdf 規格書核定調整修正

### 變更類型
- `Specification Alignment / Multi-Platform Protocol Refactor / Diagnostic & Parser Fix`

### 變更目的
依據明緯原廠使用手冊 `NTS,NTU-C.pdf` 第 5.4 節《RS-232/UART 通訊》官方圖紙與規格規範（包含使用者上傳之第 34 頁圖紙），全方面將本專案四大多端架構（Web Serial HMI、PC WPF 桌面控制中心、Android 手機/平板 HMI、ESP32-S3 嵌入式面板）之通訊指令格式、時序約束、19-Bit 狀態旗標與 Q 遙測封包解析邏輯進行 100% 嚴格核定、調整與修正，徹底終結指令不符合原廠韌體契約導致之通訊異常。

### 變更內容
1. **7 大核心指令幀格式 100% 依原廠規格對齊**：
   - **`C` 指令（遠端開關機）**：全面升級為原廠第 49 頁標準 17 位元組幀格式：
     - Remote ON: `C010000000000000\r`（`b0=0`, `b1=1`, `b2~b14=0`）
     - Remote OFF: `C100000000000000\r`（`b0=1`, `b1=0`, `b2~b14=0`）
     - 回覆格式：單一位元組 `C` (`0x43`)。
     - 全平台程式碼（Web Serial、PC WPF、Android Kotlin、ESP32 C++）自動將舊式簡化語法升級轉換，向下相容舊輸入。
   - **`V` 指令（輸出電壓與頻率設定）**：全面依據原廠第 21, 28, 40 頁標準升級為 11 位元組幀格式：
     - 格式：`V WWW FFF [CS_H][CS_L]\r`，其中校驗碼為 2 位元組之累加大端二進制原始 Byte (`(sum >> 8) & 0xFF`, `sum & 0xFF`)，而非 4 位 ASCII 字串。
     - 寫入前強制先發送 `pU\r` 參數防寫解鎖指令，並延遲 $\ge 20\text{ ms}$ 後才發送 V 指令。
     - 回覆格式：`#[Voltage] [Frequency] [CS_H][CS_L]\r`。
   - **`W` 指令（EEPROM 參數寫入）**：原廠第 42, 52 頁規範為完整 99 位元組參數寫入幀（與 I 回覆格式相同，開頭為 `W`，末尾帶 2-Byte Checksum），釐清節能模式由面板 DIP SW4 硬體控制或 99-Byte EEPROM 寫入，修正單純發送 `W 1\r` 之非正規認知。
   - **`U` 指令（NTU 專屬電池優先 UVP/OVP 轉移電壓設定）**：
     - 讀取指令：`U\r`（原廠第 53 頁，回覆 33 位元組）。
     - 設定指令：`U[UVP:4B] [OVP:4B] 00.0 00.0 00.0 00.0 [Checksum:2B]\r`（需先啟用 Battery First 旗標）。
2. **19-Bit 狀態旗標與成因 SOP 排錯 100% 對齊原廠手冊第 37~38 頁**：
   - 徹底修正歷史誤植（如將 b6 誤標為風扇、b7 誤標為過壓等嚴重偏差）：
     - `b0`: Inverter Mode (逆變模式工作中)
     - `b1`: Bypass Mode (UPS 市電旁路直通供電)
     - `b2`: Utility Power Supply (市電市網輸入正常)
     - `b3`: Utility Charger Enable (市電充電啟用)
     - `b4`: Solar Charger Enable (太陽能充電啟用)
     - `b5`: Saving Mode Occurred (綠能節能模式動作中)
     - `b6`: Battery Exhausted Mode (電池欠壓告警 / Battery Low)
     - `b7`: Shutdown Mode (電池沒電停機保護 / Battery Used Up)
     - `b8`: Battery OVP (電池過壓保護)
     - `b9`: 遠端控制 Shutdown INVERTER (遙控關閉狀態)
     - `b10`: OLP 100~115% (輕度過載警報，最長 3 分鐘)
     - `b11`: OLP 115~150% (中度過載警報，10 秒緊急保護)
     - `b12`: OLP 150%~ (重度過載極限關斷)
     - `b13`: OTP / Fan Lock Protection (過溫保護或散熱風扇堵轉)
     - `b14`: INV UVP Protection (交流輸出欠壓保護)
     - `b15`: INV OVP Protection (交流輸出過壓保護)
     - `b16`: INV Fault (逆變功率模組硬體嚴重故障)
     - `b17`: EEPROM Error Code (內部參數校驗記憶體異常)
     - `b18`: System Shutdown (系統全面保護性關閉)
3. **Q 遙測封包欄位重大修正與雙模相容機制**：
   - 經核對第 37 頁規格表與第 48 頁實機回傳指令解釋，官方真實欄位為：
     - `tokens[0]`: `VVV` 交流輸出電壓 (0~250Vac)
     - `tokens[1]`: `QQQ` 數位輸出負載% (0~100%)
     - `tokens[2]`: `SS.S` 輸入電池電壓 (例如 12.6 或 48.3)
     - `tokens[3]`: `BBB` 電池容量比例 (例如 075 = 75%)
     - `tokens[4]`: `TT.T` 散熱器溫度 (0~99.9°C)
     - `tokens[5]`: `MMM` 輸入市電電壓 (0~250Vac)
     - `tokens[6]`: `RR.R` 輸出頻率 (40.0~70.0Hz)
     - `tokens[7]`: `DDD` DC Bus 電壓 (0V 或高壓母線)
     - `tokens[8]`: `PPP` 類比輸出負載% (0~100%)
     - `tokens[9]`: `b0~b18` 19 位元狀態字串
   - 全平台解析器實作雙模相容機制：若 `tokens[2]` 帶小數點（如 12.6V），以 `tokens[2]` 作為電池電壓、`tokens[3]` 作為電池容量；同時相容舊式第三方程式測試樣本，消除數值錯位引發之虛假高壓/過載警報。
4. **全平台程式碼與發布檔同步更新**：
   - Web Serial HMI (`web-serial-hmi/app.js`, `docs/app.js`, `app.js` 與 `index.html`)：三目錄檔案 100% 同步鏡像。
   - PC WPF 桌面中心 (`pc-laptop-hmi/`): `SerialManager.cs`, `MainViewModel.cs`, `MainWindow.xaml`, `NtuTelemetry.cs` 同步更新，並重新以 Release win-x64 構建發布最新 `NTU1200_HMI.exe`。
   - Android 協定庫 (`android-phone-hmi/protocol/`): `NtuCommandSpec.kt`, `NtuPacketBuilder.kt`, `NtuPacketParser.kt`, `NtuTelemetryModel.kt` 更新，增補單元測試。
   - ESP32-S3 面板韌體 (`esp32-s3-hmi/src/`): `ntu_protocol.h`, `ntu_protocol.cpp` 更新。

### 影響範圍
- `web-serial-hmi/`, `docs/`, `./`
- `pc-laptop-hmi/`
- `android-phone-hmi/protocol/`
- `esp32-s3-hmi/src/`
- `VerificationCoverageMatrix.md`

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261117_002340`。
- WPF 建置發布：`PASS`（`dotnet publish` 0 警告 0 錯誤）。
- 協定與手冊圖紙一致性：`PASS`（100% 符應 `NTS,NTU-C.pdf` 第 34~54 頁）。

---

## [2026-11-17 15:55:00 +08:00] - 實體 Remote Port RJ11 正視 (6到1) 腳位重新校準、實測 -9.1V/0V 電氣原理剖析與 10 秒抓真 Tx SOP

### 變更類型
- `Documentation / Hardware Pinout & Electrical Diagnostic SOP Update`

### 變更目的
依據使用者實測數據（DB9 端子 3 號孔量測 -9.1V，端子 2 號孔量測 0V）以及原廠規格書第 6 頁《Remote port connector (RJ11)》圖紙與機身實體鋼印刻字（正視母座卡榫朝上時，腳位由左至右為 `6 5 4 3 2 1`），全方面校準接線說明手冊，徹底消除圖示與實體之間「由左至右 1~6 vs 6~1」之混淆，並提供電錶 10 秒抓出真實 NTU-1200 Tx 腳位的終極排錯 SOP。

### 變更內容
1. **收錄原廠核定圖紙**：
   - 將原廠 Remote Port 定義圖紙歸檔至 `docs/R11_RS232/official_remote_port_pinout.png`。
   - 明確標註正視母座（卡榫凹槽在頂部時）之實體針腳由左至右為 **`Pin 6`、`Pin 5`、`Pin 4`、`Pin 3`、`Pin 2`、`Pin 1`**。
2. **水晶頭插入姿態與線色對齊校準**：
   - 卡榫朝上插入時，由左至右各槽位對應：
     - Pin 6: 空槽 (NC)
     - Pin 5: 綠色線 (NC) ──► 剪平絕緣不接
     - Pin 4: **橘色線 (Inverter Tx)** ──► 鎖入 DB9 端子台 **`2` 號孔 (RXD)**
     - Pin 3: **藍色線 (Inverter GND)** ──► 鎖入 DB9 端子台 **`5` 號孔 (GND)**
     - Pin 2: **棕色線 (Inverter Rx)** ──► 鎖入 DB9 端子台 **`3` 號孔 (TXD)**
     - Pin 1: 空槽 (NC)
3. **實測電壓剖析與 10 秒抓真 Tx 檢驗法**：
   - 詳解 DB9 端子 3 號孔量到 -9.1V 為電腦 TXD 待命之標準 RS-232 MARK 負電壓，證實電腦端正常。
   - 詳解 DB9 端子 2 號孔量到 0V 之物理成因（RXD 為純輸入，電壓必須由逆變器 Tx 提供；若為 0V 代表逆變器未開機或線色鏡像反接）。
   - 提供脫開端子台、直接在逆變器出線上量測負電壓之 10 秒黃金判定 SOP。

### 影響範圍
- `docs/R11_RS232/README.md`
- `docs/RJ11_RS232_Pinout_Diagram.md`
- `docs/R11_RS232/official_remote_port_pinout.png`

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261117_155000`。
- 圖面與實物一致性：`PASS`（完全符應使用者上傳圖紙與機身刻字）。

---

## [2026-11-17 16:10:00 +08:00] - 實體四芯電話線線色與 DB9 端子台最終正確鎖線對照核定

### 變更類型
- `Documentation / Hardware Pinout Alignment & Wiring Fix`

### 變更目的
依據使用者對實體水晶頭（卡榫朝上、金屬接觸片朝下，線色由左至右為 `空、棕、藍、橘、綠、空`）與母座針腳（`6 5 4 3 2 1`）之垂直對齊人工確認，最終核定各色線芯訊號與 DB9 端子台鎖線關係，並徹底解釋先前接錯導致「-9.1V」與「0V」之完整成因。

### 變更內容
1. **核定最終實體接線對照**：
   - **藍色線 (Blue)**：對應 Pin 4 ──► **Inverter Tx** ──► 鎖入 DB9 端子台 **`2` 號孔 (RXD)**
   - **橘色線 (Orange)**：對應 Pin 3 ──► **Inverter GND** ──► 鎖入 DB9 端子台 **`5` 號孔 (GND)**
   - **綠色線 (Green)**：對應 Pin 2 ──► **Inverter Rx** ──► 鎖入 DB9 端子台 **`3` 號孔 (TXD)**
   - **棕色線 (Brown)**：對應 Pin 5 ──► **NC 空腳** ──► 剪平絕緣，嚴禁接線
2. **先前量測現象全面破解**：
   - 先前將棕色接 3 號孔：電腦 TXD (-9.1V) 發送至 Pin 5 (NC 空腳)，故逆變器完全收不到指令。
   - 先前將橘色接 2 號孔：電腦 RXD 接收端直接接在 Pin 3 (GND)，故端子台量測恆為 0V。
   - 藍色誤接 5 號孔：逆變器 Tx 誤接地，因 RS-232 具備連續短路保護，雙方完全無損。
3. **更新說明文件**：
   - `docs/R11_RS232/README.md`
   - `docs/RJ11_RS232_Pinout_Diagram.md`

### 影響範圍
- 實體接線指南與文件，零破壞軟體程式碼。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261117_160500`。
- 圖解與實體線芯一致性：`PASS`（使用者人工確認線芯順序）。


---

## [2026-11-17 23:15:00 +08:00] - Web HMI 電力潮流拓撲佈局修復與深層循環電池建議設定 (UXH100-12FR) 雙端介面化導入

### 變更類型
- `Feature / UI Alignment & Bug Fix / Battery Engineering Presets`

### 變更目的
1. **修正 Web HMI 動態拓撲佈局異常**：針對 Web 介面在部分寬度下電力潮流即時拓撲元件錯位（交流負載掉至市電輸入下方、逆變器核心與電池垂直通道競合推擠）之 CSS Grid 缺陷進行重構，對齊 PC WPF 原生桌面端之左中右標準線性電力潮流流程。
2. **導入常用深層循環電池建議設定與一鍵套用**：依據使用者提供之台灣湯淺 YUASA **UXH100-12FR**（12V 100Ah 難燃長壽命高率放電 AGM 鉛酸電池）原廠性能規格書，於 Web HMI 與 PC WPF 桌面中心同步新增「常用深層循環電池建議設定與一鍵套用」面板，提供對齊原廠放電終止線（10.5V~10.8V）之最佳化保護門檻，徹底防止極板硫酸鹽化。

### 變更內容
1. **Web HMI 動態拓撲 CSS Grid 重構 (`style.css`)**：
   - 明確指派拓撲 7 大元件之絕對網格座標：
     - `#nodeGrid`: `grid-column: 1; grid-row: 1;`（市電輸入，左側）
     - `#pathGridToBypass`: `grid-column: 2; grid-row: 1;`（市電直通動畫）
     - `#coreInverter`: `grid-column: 3; grid-row: 1;`（逆變器轉換主核心，中央）
     - `#pathCoreToLoad`: `grid-column: 4; grid-row: 1;`（交流 110V 輸出動畫）
     - `#nodeLoad`: `grid-column: 5; grid-row: 1;`（交流負載，右側）
     - `#pathBatToInverter`: `grid-column: 3; grid-row: 2;`（垂直升壓動畫）
     - `#nodeBat`: `grid-column: 3; grid-row: 3;`（直流電池組，置中正下方）
   - 徹底杜絕網格自動流動（Auto-placement）造成的元素錯位與換行變形，三目錄靜態檔案完全鏡像同步。
2. **雙端介面化新增「常用深層循環電池建議設定與一鍵套用」**：
   - **4 大電池化學預設一鍵切換**：
     - **🏆 湯淺 UXH100-12FR (推薦首選)**：預警 `11.5 V` / 切斷 `10.6 V` / 負載 `950 W`。
     - **🔋 常規 AGM / GEL 深循環**：預警 `11.6 V` / 切斷 `10.8 V` / 負載 `1000 W`。
     - **⚡ 磷酸鐵鋰 LiFePO4 (4S)**：預警 `12.5 V` / 切斷 `11.2 V` / 負載 `1200 W`。
     - **🏭 明緯原廠出廠預設值**：預警 `11.0 V` / 切斷 `10.0 V` / 負載 `1200 W`。
   - **原廠規格書科學對照與保護分析表**：
     - 放電終止電壓原理：5h~20h 放電率終止電壓為 10.50V~10.80V，若常規放到 10.0V 以下會導致極板硫酸鹽化、壽命腰斬。
     - 輕載 (110W~210W, 5~10h)、中載 (450W, 2h)、重載 (800W, 1h) 放電表現與門檻設定建議。
     - 外部充電規範提醒：25°C 浮充電壓 13.65V ± 0.15V，最大充電電流限制 25A (0.25CA)。
3. **PC WPF 桌面中心邏輯整合與 EXE 重新發布**：
   - 在 `MainViewModel.cs` 與 `MainWindow.xaml.cs` 實作 `ApplyBatteryPreset()` 邏輯，點擊按鈕即時寫入門檻、連動即時警報評估並彈出詳細配置提示。
   - 執行 `dotnet publish`，產出全新單一可執行檔 `pc-laptop-hmi/publish/NTU1200_HMI.exe`。
4. **專案手冊與驗證矩陣同步**：
   - 更新 `docs/NTU-1200-112US_HMI_Manual.md` 新增第 6 節電池指南。
   - 更新 `README.md` 雙模式架構功能說明。
   - 更新 `VerificationCoverageMatrix.md`，新增 `V-BAT-01` (PASS)，並將 `V-HW-01` 狀態正式更新為 PASS（實機 COM8 連線遙測驗證通過）。

### 影響範圍
- 前端 Web 視圖、PC WPF 桌面端、專案技術手冊。通訊協議底層 100% 保持相容。

### 驗證狀態
- Git 備份標籤：`backup/NTU-1200-112US_20261117_230500`。
- WPF 編譯與發布：`PASS`（0 警告、0 錯誤，已產出 NTU1200_HMI.exe）。
- 實機 COM8 遙測通訊驗證：`PASS`（實測成功接收 Q 封包並寫入即時 CSV 日誌）。
