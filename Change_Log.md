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
