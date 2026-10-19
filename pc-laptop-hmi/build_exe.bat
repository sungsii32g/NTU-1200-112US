@echo off
chcp 65001 > nul
title MEAN WELL NTU-1200-112US EXE 快速建置腳本

echo ======================================================================
echo   MEAN WELL NTU-1200-112US 筆電/工控 PC 原生桌面 EXE 建置腳本
echo   正在使用 .NET SDK 編譯發布獨立可執行檔 (NTU1200_HMI.exe)...
echo ======================================================================

dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] 系統中未找到 dotnet 命令！請確認已安裝 .NET 8 或更高版本 SDK。
    pause
    exit /b
)

echo [建置中] 正在發布單一檔案 EXE 至 publish/ 目錄...
dotnet publish Ntu1200Hmi.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o ./publish

if %errorlevel% equ 0 (
    echo ======================================================================
    echo   [成功] 建置發布完成！
    echo   檔案位置: publish\NTU1200_HMI.exe
    echo   您可直接雙擊 publish\NTU1200_HMI.exe 執行應用程式。
    echo ======================================================================
) else (
    echo [錯誤] 編譯過程發生錯誤，請查看上方輸出紀錄。
)

pause
