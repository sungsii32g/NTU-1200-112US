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
