@echo off
chcp 65001 > nul
title MEAN WELL NTU-1200-112US 監控中心啟動器

echo ======================================================================
echo   MEAN WELL NTU-1200-112US 筆電 / 工控 PC 桌面與 Web 監控中心
echo ======================================================================

if exist "publish\NTU1200_HMI.exe" (
    echo [啟動] 正在執行原生桌面監控中心 (publish\NTU1200_HMI.exe)...
    start "" "publish\NTU1200_HMI.exe"
    exit /b
)

:: 若未發布，則嘗試 dotnet run
dotnet --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [編譯運行] 正在使用 .NET 啟動應用程式...
    dotnet run --project Ntu1200Hmi.csproj
    exit /b
)

:: 若未安裝 .NET，則回退至 Python Web 伺服器
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [Web 模式] 正在啟動 Python Web 伺服器 (http://localhost:8080)...
    start "" cmd /c "timeout /t 2 >nul & start http://localhost:8080"
    python server.py
    exit /b
)

echo [提示] 請先執行 build_exe.bat 進行編譯，或使用 Visual Studio 開啟 NTU1200_HMI.sln。
pause
