@echo off
chcp 65001 > nul
title MEAN WELL NTU-1200-112US 舊筆電/PC 監控中心

echo ======================================================================
echo   MEAN WELL NTU-1200-112US 工業級監控中心 (PC-Laptop HMI)
echo   正在啟動本機伺服器...
echo ======================================================================

:: 檢查 Python 是否已安裝
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Python！請確認本電腦已安裝 Python 3.7 以上版本並勾選 Add to PATH。
    pause
    exit /b
)

:: 自動安裝/檢查 pyserial
echo [檢查依賴] 正在確認 pyserial 模組...
python -c "import serial" >nul 2>&1
if %errorlevel% neq 0 (
    echo [安裝依賴] 正在自動安裝 pyserial...
    pip install pyserial
)

:: 延遲 1.5 秒自動開啟瀏覽器
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8080"

:: 啟動 Python 後端伺服器
echo [服務啟動] 正在啟動後台通訊與 Web 服務 (http://localhost:8080)...
python server.py

pause
