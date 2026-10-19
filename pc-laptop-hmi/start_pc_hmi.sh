#!/usr/bin/env bash
# MEAN WELL NTU-1200-112US 舊筆電 / PC / RK3568 Linux 啟動腳本

echo "======================================================================"
echo "  MEAN WELL NTU-1200-112US 工業級監控中心 (PC-Laptop / Linux HMI)"
echo "======================================================================"

# 檢查 python3
if ! command -v python3 &> /dev/null; then
    echo "[錯誤] 找不到 python3！請先執行: sudo apt install python3 python3-pip"
    exit 1
fi

# 檢查 pyserial
python3 -c "import serial" &> /dev/null
if [ $? -ne 0 ]; then
    echo "[安裝依賴] 正在安裝 pyserial..."
    pip3 install pyserial || sudo apt install -y python3-serial
fi

# 在後台延遲 2 秒嘗試開啟瀏覽器 (若有圖形桌面環境)
if command -v xdg-open &> /dev/null; then
    (sleep 2 && xdg-open http://localhost:8080) &
fi

echo "[服務啟動] 正在啟動伺服器 (http://0.0.0.0:8080)..."
python3 server.py
