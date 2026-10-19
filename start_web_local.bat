@echo off
chcp 65001 >nul
echo ========================================================
echo   MEAN WELL NTU-1200-112US 本機安全 Web Serial 伺服器
echo ========================================================
echo.
echo [提示] 瀏覽器 Web Serial API 規範要求運行於安全來源 (HTTPS 或 http://localhost)
echo 正在啟動本機安全伺服器並自動開啟瀏覽器...
echo.

start http://localhost:8080/
python -m http.server 8080 --directory docs

if %errorlevel% neq 0 (
    echo.
    echo 未偵測到 Python，嘗試使用 Python3...
    python3 -m http.server 8080 --directory docs
)
pause
