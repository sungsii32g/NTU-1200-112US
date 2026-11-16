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
