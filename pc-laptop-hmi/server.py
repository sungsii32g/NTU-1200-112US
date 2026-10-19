#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MEAN WELL NTU-1200-112US 舊筆電 / PC 工業級桌面與 Web 監控中心 (PC-Laptop HMI)
支援 Windows 7/10/11、Ubuntu/Debian Linux (含 RK3568 AIO-3568J)
具備 USB 串列埠自動識別、自動探測連接、即時遙測、歷史趨勢與安全互鎖控制。
"""

import os
import sys
import time
import json
import csv
import threading
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

# 嘗試載入 pyserial
try:
    import serial
    import serial.tools.list_ports
    HAS_PYSERIAL = True
except ImportError:
    HAS_PYSERIAL = False
    print("⚠️ 警告: 未檢測到 'pyserial' 函式庫，將僅支援【離線模擬模式】。")
    print("👉 請在終端機執行: pip install pyserial 以啟用實體 USB 串列埠功能。")

# 常數規範 (嚴格遵循明緯原廠使用手冊第 5.4 節)
BAUD_RATE = 9600
DATA_BITS = 8
STOP_BITS = 1
POLL_INTERVAL_SEC = 0.5   # >= 500ms 輪詢間隔
READ_TIMEOUT_SEC = 0.15   # 150ms 典型回應逾時
STALE_THRESHOLD_SEC = 1.5 # 1.5 秒未回應判定過期

HTTP_PORT = 8080
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)


class TelemetryState:
    """即時遙測狀態管理器"""
    def __init__(self):
        self.lock = threading.Lock()
        self.is_connected = False
        self.is_stale = False
        self.mode = "DISCONNECTED"  # "LIVE", "MOCK", "DISCONNECTED"
        self.active_port = None
        self.active_device_name = "未連接"
        self.last_update_ts = 0
        self.latency_ms = 0
        self.raw_packet = ""
        self.last_tx = ""
        
        # 電力遙測數據
        self.ac_output_voltage = 0.0
        self.load_percent = 0
        self.load_watts = 0.0
        self.battery_voltage = 0.0
        self.temperature = 0.0
        self.grid_input_voltage = 0.0
        self.output_frequency = 0.0
        self.dc_bus_voltage = 0.0
        
        # 狀態旗標
        self.inverter_active = False
        self.utility_bypass = False
        self.grid_normal = False
        self.saving_mode = False
        self.fault = False
        self.eeprom_error = False
        self.power_path = "STANDBY" # "INVERTER_BATTERY", "UTILITY_BYPASS", "STANDBY", "FAULT"
        self.battery_status = "UNKNOWN" # "NORMAL", "LOW_ALARM", "LOW_SHUTDOWN", "HIGH_ALARM", "HIGH_SHUTDOWN"
        
        # 歷史暫存 (供即時趨勢圖使用，最多 60 筆)
        self.history = []

    def update_from_raw(self, raw_str, latency):
        with self.lock:
            trimmed = raw_str.strip().replace("\r", "").replace("\n", "")
            if not (trimmed.startswith("(") and trimmed.endswith(")")):
                return False
            
            content = trimmed[1:-1].strip()
            tokens = content.split()
            if len(tokens) < 10:
                return False
            
            try:
                self.ac_output_voltage = float(tokens[0])
                self.load_percent = int(tokens[1])
                self.load_watts = round(self.load_percent * (1200.0 / 100.0), 1)
                self.battery_voltage = float(tokens[3])
                self.temperature = float(tokens[4])
                self.grid_input_voltage = float(tokens[5])
                self.output_frequency = float(tokens[6])
                self.dc_bus_voltage = float(tokens[7])
                
                bit_str = tokens[9]
                self.inverter_active = (bit_str[0] == '1') if len(bit_str) > 0 else False
                self.utility_bypass = (bit_str[1] == '1') if len(bit_str) > 1 else False
                self.grid_normal = (bit_str[2] == '1') if len(bit_str) > 2 else False
                self.saving_mode = (bit_str[5] == '1') if len(bit_str) > 5 else False
                self.fault = (bit_str[16] == '1') if len(bit_str) > 16 else False
                self.eeprom_error = (bit_str[17] == '1') if len(bit_str) > 17 else False
                
                # 電力路徑
                if self.fault:
                    self.power_path = "FAULT"
                elif self.utility_bypass:
                    self.power_path = "UTILITY_BYPASS"
                elif self.inverter_active:
                    self.power_path = "INVERTER_BATTERY"
                else:
                    self.power_path = "STANDBY"
                
                # 電池狀態
                if self.battery_voltage < 10.0:
                    self.battery_status = "LOW_SHUTDOWN"
                elif self.battery_voltage < 11.0:
                    self.battery_status = "LOW_ALARM"
                elif self.battery_voltage > 16.5:
                    self.battery_status = "HIGH_SHUTDOWN"
                elif self.battery_voltage > 15.5:
                    self.battery_status = "HIGH_ALARM"
                else:
                    self.battery_status = "NORMAL"
                
                now = time.time()
                self.last_update_ts = now
                self.latency_ms = latency
                self.raw_packet = trimmed
                self.is_connected = True
                self.is_stale = False
                
                # 加入歷史緩存
                sample = {
                    "time": datetime.now().strftime("%H:%M:%S"),
                    "v_bat": self.battery_voltage,
                    "watts": self.load_watts,
                    "temp": self.temperature,
                    "v_ac": self.ac_output_voltage
                }
                self.history.append(sample)
                if len(self.history) > 60:
                    self.history.pop(0)
                    
                return True
            except Exception as e:
                return False

    def to_dict(self):
        with self.lock:
            # 檢查是否過期
            if self.is_connected and (time.time() - self.last_update_ts > STALE_THRESHOLD_SEC):
                self.is_stale = True
            return {
                "is_connected": self.is_connected,
                "is_stale": self.is_stale,
                "mode": self.mode,
                "active_port": self.active_port,
                "active_device_name": self.active_device_name,
                "last_update": datetime.fromtimestamp(self.last_update_ts).strftime("%Y-%m-%d %H:%M:%S") if self.last_update_ts else "無",
                "latency_ms": self.latency_ms,
                "raw_packet": self.raw_packet,
                "last_tx": self.last_tx,
                "telemetry": {
                    "ac_output_voltage": self.ac_output_voltage,
                    "load_percent": self.load_percent,
                    "load_watts": self.load_watts,
                    "battery_voltage": self.battery_voltage,
                    "temperature": self.temperature,
                    "grid_input_voltage": self.grid_input_voltage,
                    "output_frequency": self.output_frequency,
                    "dc_bus_voltage": self.dc_bus_voltage
                },
                "flags": {
                    "inverter_active": self.inverter_active,
                    "utility_bypass": self.utility_bypass,
                    "grid_normal": self.grid_normal,
                    "saving_mode": self.saving_mode,
                    "fault": self.fault,
                    "eeprom_error": self.eeprom_error
                },
                "power_path": self.power_path,
                "battery_status": self.battery_status
            }


class SerialAutoManager:
    """智慧串列埠自動探測與輪詢器"""
    def __init__(self, state: TelemetryState):
        self.state = state
        self.serial_port = None
        self.running = True
        self.target_port = "AUTO"  # "AUTO", "MOCK", 或指定例如 "COM3" / "/dev/ttyUSB0"
        self.poll_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.poll_thread.start()

    def get_available_ports(self):
        """掃描系統現有可用 USB 串列埠並辨識晶片"""
        if not HAS_PYSERIAL:
            return [{"port": "MOCK", "desc": "離線模擬示範設備 (Demo Mode)", "hw": "VIRTUAL"}]
        
        results = []
        try:
            ports = list(serial.tools.list_ports.comports())
            for p in ports:
                desc = p.description or ""
                hwid = p.hwid or ""
                friendly_type = "通用串口"
                
                # 智慧識別常見晶片 (包含使用者手上的現有硬體)
                if "110A" in hwid or "UPort" in desc or "MOXA" in desc:
                    friendly_type = "MOXA 工業級串口 (UPort 1110/1150)"
                elif "0403:6001" in hwid or "FT232" in desc or "FTDI" in desc:
                    friendly_type = "FTDI 晶片 (FT232BL / FT232RL / 隔離版)"
                elif "10C4:EA60" in hwid or "CP210" in desc:
                    friendly_type = "Silicon Labs (CP2104 / CP2102)"
                elif "1A86:7523" in hwid or "CH340" in desc:
                    friendly_type = "沁恆 (CH340 / CH341)"
                elif "067B" in hwid or "PL2303" in desc or "UNITEK" in desc:
                    friendly_type = "UNITEK / 旺玖 (PL2303 USB-RS232)"
                
                results.append({
                    "port": p.device,
                    "desc": f"{p.device}: {desc} ({friendly_type})",
                    "hw": hwid,
                    "type": friendly_type
                })
        except Exception as e:
            print(f"掃描串口異常: {e}")
            
        results.append({"port": "MOCK", "desc": "離線模擬示範模式 (無硬體展示)", "hw": "VIRTUAL", "type": "模擬"})
        return results

    def set_target_port(self, port_name):
        self.target_port = port_name
        self.close_port()

    def close_port(self):
        if self.serial_port and self.serial_port.is_open:
            try:
                self.serial_port.close()
            except Exception:
                pass
        self.serial_port = None
        self.state.is_connected = False
        self.state.active_port = None
        self.state.active_device_name = "未連接"

    def send_command(self, cmd_str):
        """發送控制指令 (帶結尾 CR)"""
        if not cmd_str.endswith("\r"):
            cmd_str += "\r"
            
        self.state.last_tx = cmd_str.replace("\r", "\\r")
        if self.target_port == "MOCK" or not self.serial_port:
            return True, "指令已在模擬模式執行"
        
        try:
            self.serial_port.write(cmd_str.encode("ascii"))
            self.serial_port.flush()
            return True, f"成功發送: {cmd_str.strip()}"
        except Exception as e:
            return False, f"發送失敗: {e}"

    def _probe_and_open(self, port_name):
        """嘗試開啟並驗證 NTU-1200 握手"""
        try:
            s = serial.Serial(
                port=port_name,
                baudrate=BAUD_RATE,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=READ_TIMEOUT_SEC,
                write_timeout=0.2
            )
            # 清空緩存並發送 Q\r 查詢
            s.reset_input_buffer()
            s.reset_output_buffer()
            s.write(b"Q\r")
            time.sleep(0.05)
            response = s.read(128).decode("ascii", errors="ignore")
            if "(" in response and ")" in response:
                return s
            s.close()
        except Exception:
            pass
        return None

    def _worker_loop(self):
        """後台高可靠輪詢循環"""
        mock_step = 0
        csv_flush_counter = 0
        
        while self.running:
            try:
                # 1. 處理離線模擬模式 (MOCK)
                if self.target_port == "MOCK":
                    self.state.mode = "MOCK"
                    self.state.active_port = "VIRTUAL_MOCK"
                    self.state.active_device_name = "離線模擬示範器 (Mock Inverter)"
                    
                    # 模擬動態波動數據
                    mock_step += 1
                    sim_load = 30 + (mock_step % 20)
                    sim_vbat = 12.6 - ((mock_step % 15) * 0.1)
                    sim_temp = 36.5 + ((mock_step % 8) * 0.5)
                    mock_raw = f"(110.0 {sim_load:03d} {sim_load:04.1f} {sim_vbat:04.1f} {sim_temp:04.1f} 110.0 060.0 162.0 000 1011000000000000000)\r"
                    self.state.update_from_raw(mock_raw, latency=12)
                    time.sleep(POLL_INTERVAL_SEC)
                    continue

                # 2. 實體硬體模式 (需 pyserial)
                if not HAS_PYSERIAL:
                    self.target_port = "MOCK"
                    continue

                # 若尚未連線，嘗試連線
                if self.serial_port is None or not self.serial_port.is_open:
                    if self.target_port == "AUTO":
                        # 自動探測所有已插入的 USB 設備
                        ports = [p.device for p in serial.tools.list_ports.comports()]
                        for p in ports:
                            s = self._probe_and_open(p)
                            if s:
                                self.serial_port = s
                                self.state.active_port = p
                                self.state.mode = "LIVE"
                                self.state.active_device_name = f"自動鎖定: {p}"
                                print(f"✅ 自動識別成功！已鎖定 NTU-1200 於端口: {p}")
                                break
                    else:
                        # 指定單一端口
                        try:
                            s = serial.Serial(
                                port=self.target_port,
                                baudrate=BAUD_RATE,
                                bytesize=serial.EIGHTBITS,
                                parity=serial.PARITY_NONE,
                                stopbits=serial.STOPBITS_ONE,
                                timeout=READ_TIMEOUT_SEC,
                                write_timeout=0.2
                            )
                            self.serial_port = s
                            self.state.active_port = self.target_port
                            self.state.mode = "LIVE"
                            self.state.active_device_name = f"手動連接: {self.target_port}"
                        except Exception as e:
                            self.state.is_connected = False
                            time.sleep(1.0)
                            continue

                # 若仍未連上，休息後重試
                if self.serial_port is None:
                    time.sleep(1.0)
                    continue

                # 3. 正常輪詢發送 Q\r
                t_start = time.time()
                self.serial_port.reset_input_buffer()
                self.serial_port.write(b"Q\r")
                raw_bytes = self.serial_port.read_until(b"\r")
                t_end = time.time()
                
                raw_str = raw_bytes.decode("ascii", errors="ignore")
                latency = int((t_end - t_start) * 1000)
                
                if raw_str and "(" in raw_str and ")" in raw_str:
                    self.state.update_from_raw(raw_str, latency)
                    
                    # 每 30 秒自動寫入一筆 CSV 歷史紀錄
                    csv_flush_counter += 1
                    if csv_flush_counter >= 60:
                        csv_flush_counter = 0
                        self._log_to_csv()
                else:
                    # 讀取逾時或異常
                    if time.time() - self.state.last_update_ts > STALE_THRESHOLD_SEC:
                        self.state.is_stale = True

                time.sleep(POLL_INTERVAL_SEC)

            except Exception as e:
                print(f"輪詢通訊發生異常: {e}")
                self.close_port()
                time.sleep(1.0)

    def _log_to_csv(self):
        """將遙測數據持久化至 CSV 檔案"""
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            filepath = os.path.join(LOG_DIR, f"ntu1200_telemetry_{today}.csv")
            file_exists = os.path.isfile(filepath)
            
            with open(filepath, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(["Timestamp", "AC_Volt", "Load_Pct", "Load_Watts", "Bat_Volt", "Temp", "Grid_Volt", "Freq", "PowerPath", "Status"])
                with self.state.lock:
                    writer.writerow([
                        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        self.state.ac_output_voltage,
                        self.state.load_percent,
                        self.state.load_watts,
                        self.state.battery_voltage,
                        self.state.temperature,
                        self.state.grid_input_voltage,
                        self.state.output_frequency,
                        self.state.power_path,
                        self.state.battery_status
                    ])
        except Exception:
            pass


# 全域單例
STATE = TelemetryState()
SERIAL_MGR = SerialAutoManager(STATE)


class HmiRequestHandler(SimpleHTTPRequestHandler):
    """輕量化 HTTP API 與 Web 介面靜態檔案伺服器"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/status":
            self._send_json(STATE.to_dict())
        elif parsed.path == "/api/ports":
            ports = SERIAL_MGR.get_available_ports()
            self._send_json({"ports": ports, "target": SERIAL_MGR.target_port})
        elif parsed.path == "/api/history":
            with STATE.lock:
                self._send_json({"history": list(STATE.history)})
        else:
            # 預設首頁
            if parsed.path == "/" or parsed.path == "":
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8")
        data = json.loads(body) if body else {}

        if parsed.path == "/api/connect":
            port = data.get("port", "AUTO")
            SERIAL_MGR.set_target_port(port)
            self._send_json({"success": True, "message": f"切換目標埠為: {port}"})

        elif parsed.path == "/api/control":
            # 控制命令 (安全保護互鎖)
            cmd_type = data.get("type")
            if cmd_type == "power":
                turn_on = data.get("turn_on", True)
                cmd = "C 1\r" if turn_on else "C 0\r"
                success, msg = SERIAL_MGR.send_command(cmd)
                self._send_json({"success": success, "message": msg})
            elif cmd_type == "saving":
                enable = data.get("enable", True)
                cmd = "W 1\r" if enable else "W 0\r"
                success, msg = SERIAL_MGR.send_command(cmd)
                self._send_json({"success": success, "message": msg})
            elif cmd_type == "unlock":
                success, msg = SERIAL_MGR.send_command("pU\r")
                self._send_json({"success": success, "message": msg})
            else:
                self._send_json({"success": False, "message": "未知指令類型"}, code=400)

        elif parsed.path == "/api/disconnect":
            SERIAL_MGR.close_port()
            SERIAL_MGR.target_port = "DISCONNECTED"
            self._send_json({"success": True, "message": "已斷開連線"})
        else:
            self._send_json({"error": "Not Found"}, code=404)

    def _send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def main():
    print("=" * 70)
    print("  MEAN WELL NTU-1200-112US 舊筆電 / PC 工業級桌面與 Web 監控中心")
    print(f"  伺服器啟動於: http://localhost:{HTTP_PORT} 或 http://127.0.0.1:{HTTP_PORT}")
    print("  支援晶片: MOXA UPort 1110, UNITEK, FT232BL, CP2104, CH340, 離線模擬")
    print("=" * 70)

    server = HTTPServer(("0.0.0.0", HTTP_PORT), HmiRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n正在停止伺服器...")
        SERIAL_MGR.running = False
        server.server_close()
        print("已安全關閉。")


if __name__ == "__main__":
    main()
