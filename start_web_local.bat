@echo off
chcp 65001 >nul
title MEAN WELL NTU-1200-112US Web Serial 控制面板
echo ========================================================
echo   MEAN WELL NTU-1200-112US 本機安全 Web Serial 伺服器
echo ========================================================
echo.
echo [提示] 瀏覽器 Web Serial API 規範要求運行於安全來源 (HTTPS 或 http://localhost)
echo 正在啟動本機安全網頁伺服器並自動開啟瀏覽器...
echo 伺服器根目錄: docs (包含 Web HMI 介面)
echo 訪問位址: http://localhost:8080/
echo.

:: 延遲 1 秒後自動呼叫預設瀏覽器開啟頁面
start "" cmd /c "timeout /t 1 >nul & start http://localhost:8080/"

:: 優先檢測標準 python
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo [啟動引擎] 使用系統 Python 啟動 http.server...
    python -m http.server 8080 --directory docs
    goto end
)

:: 次選 py 啟動器
where py >nul 2>&1
if %errorlevel% equ 0 (
    echo [啟動引擎] 使用 py 啟動器啟動 http.server...
    py -m http.server 8080 --directory docs
    goto end
)

:: 第三選 python3
where python3 >nul 2>&1
if %errorlevel% equ 0 (
    echo [啟動引擎] 使用 python3 啟動 http.server...
    python3 -m http.server 8080 --directory docs
    goto end
)

:: 若未安裝 Python，則使用 PowerShell 內建 HttpListener 伺服器 (零依賴純原生)
echo [啟動引擎] 未偵測到 Python，使用 Windows 原生 PowerShell 伺服器...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8080/'); $listener.Start(); Write-Host 'PowerShell HTTP Server Running at http://localhost:8080/ (Press Ctrl+C to stop)'; while ($listener.IsListening) { $context = $listener.GetContext(); $req = $context.Request; $res = $context.Response; $relPath = $req.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrEmpty($relPath)) { $relPath = 'index.html' }; $filePath = Join-Path 'docs' $relPath; if (Test-Path $filePath) { $bytes = [IO.File]::ReadAllBytes($filePath); $res.ContentLength64 = $bytes.Length; if ($filePath.EndsWith('.html')) { $res.ContentType = 'text/html; charset=utf-8' } elseif ($filePath.EndsWith('.js')) { $res.ContentType = 'application/javascript; charset=utf-8' } elseif ($filePath.EndsWith('.css')) { $res.ContentType = 'text/css; charset=utf-8' }; $res.OutputStream.Write($bytes, 0, $bytes.Length) } else { $res.StatusCode = 404 }; $res.OutputStream.Close() }"

:end
echo.
echo 伺服器已停止。
pause