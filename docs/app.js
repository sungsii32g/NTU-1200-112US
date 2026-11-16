/**
 * MEAN WELL NTU-1200-112US 雲端免安裝 Web Serial 控制面板
 * 支援 W3C Web Serial API 原生 USB 連線、離線模擬展示、雙模式 (監控 vs 工程) 切換
 */

// 全域狀態
let serialPort = null;
let reader = null;
let writer = null;
let isPolling = false;
let isDemoMode = false;
let pollingTimer = null;
let mockStep = 0;
let lastPacketTime = 0;
let lastValidPacketTime = 0;
let historyPoints = []; // 60s 趨勢圖 (vbat, watts)
let pendingConfirmAction = null;
let currentBitString = '0000000000000000000';

// 可介面化自訂之安全門檻與通訊節奏
let lowBatWarnThreshold = 11.0;
let lowBatCutoffThreshold = 10.0;
let highBatWarnThreshold = 15.5;
let overloadWarnThreshold = 1200.0;
let tempWarnThreshold = 55.0;
let selectedPollRateMs = 500;
let isAudioAlertEnabled = true;

// Web Audio API 警報蜂鳴器合成器
let audioCtx = null;
let lastBeepTime = 0;
function playAlertBeep(freq = 880, duration = 0.25) {
  if (!isAudioAlertEnabled) return;
  const now = Date.now();
  if (now - lastBeepTime < 1000) return; // 避免聲音洗頻
  lastBeepTime = now;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AudioContextClass) audioCtx = new AudioContextClass();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

// DOM 元素引用
const btnWebSerial = document.getElementById('btnWebSerial');
const btnToggleDemo = document.getElementById('btnToggleDemo');
const btnDisconnect = document.getElementById('btnDisconnect');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const latencyVal = document.getElementById('latencyVal');
const browserWarning = document.getElementById('browserWarning');
const alertBanner = document.getElementById('alertBanner');
const alertMessage = document.getElementById('alertMessage');

// 分頁切換
const tabMonitor = document.getElementById('tabMonitor');
const tabEngineering = document.getElementById('tabEngineering');
const viewMonitor = document.getElementById('viewMonitor');
const viewEngineering = document.getElementById('viewEngineering');

// 潮流節點
const powerPathBadge = document.getElementById('powerPathBadge');
const flowGridVal = document.getElementById('flowGridVal');
const flowGridFreq = document.getElementById('flowGridFreq');
const flowDcBusVal = document.getElementById('flowDcBusVal');
const flowLoadWatts = document.getElementById('flowLoadWatts');
const flowLoadPct = document.getElementById('flowLoadPct');
const flowBatVolt = document.getElementById('flowBatVolt');
const flowBatStatus = document.getElementById('flowBatStatus');
const coreStatusText = document.getElementById('coreStatusText');
const pathGridToBypass = document.getElementById('pathGridToBypass');
const pathBatToInverter = document.getElementById('pathBatToInverter');
const pathCoreToLoad = document.getElementById('pathCoreToLoad');

// 數值與旗標
const valBatVolt = document.getElementById('valBatVolt');
const batStatusTag = document.getElementById('batStatusTag');
const valLoadWatts = document.getElementById('valLoadWatts');
const valAcVolt = document.getElementById('valAcVolt');
const valLoadPct = document.getElementById('valLoadPct');
const loadStatusTag = document.getElementById('loadStatusTag');
const valTemp = document.getElementById('valTemp');
const tempStatusTag = document.getElementById('tempStatusTag');
const tempBarFill = document.getElementById('tempBarFill');
const valFreq = document.getElementById('valFreq');
const valDcBus = document.getElementById('valDcBus');

const flagInverter = document.getElementById('flagInverter');
const flagBypass = document.getElementById('flagBypass');
const flagGrid = document.getElementById('flagGrid');
const flagSaving = document.getElementById('flagSaving');
const flagFault = document.getElementById('flagFault');
const flagEeprom = document.getElementById('flagEeprom');

// 終端機元素
const rawTxLine = document.getElementById('rawTxLine');
const rawRxLine = document.getElementById('rawRxLine');
const rawDeviceInfo = document.getElementById('rawDeviceInfo');

// 工程模式元素
const btnTurnOnAC = document.getElementById('btnTurnOnAC');
const btnTurnOffAC = document.getElementById('btnTurnOffAC');
const btnEnableSaving = document.getElementById('btnEnableSaving');
const btnDisableSaving = document.getElementById('btnDisableSaving');
const btnUnlock = document.getElementById('btnUnlock');
const btnQueryInfo = document.getElementById('btnQueryInfo');
const deviceInfoBox = document.getElementById('deviceInfoBox');
const txtRawCmd = document.getElementById('txtRawCmd');
const btnSendRaw = document.getElementById('btnSendRaw');

// Canvas 元素
const canvasBat = document.getElementById('gaugeBattery');
const ctxBat = canvasBat.getContext('2d');
const canvasLoad = document.getElementById('gaugeLoad');
const ctxLoad = canvasLoad.getContext('2d');
const canvasChart = document.getElementById('trendChart');
const ctxChart = canvasChart.getContext('2d');

// Modal 元素
const confirmModal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalBtnCancel = document.getElementById('modalBtnCancel');
const modalBtnConfirm = document.getElementById('modalBtnConfirm');

// 診斷 SOP Modal 元素
const diagModal = document.getElementById('diagModal');
const diagModalBitLabel = document.getElementById('diagModalBitLabel');
const diagModalName = document.getElementById('diagModalName');
const diagModalDot = document.getElementById('diagModalDot');
const diagModalStatusBadge = document.getElementById('diagModalStatusBadge');
const diagModalDesc = document.getElementById('diagModalDesc');
const diagModalCause = document.getElementById('diagModalCause');
const diagModalSop = document.getElementById('diagModalSop');
const diagModalBtnClose = document.getElementById('diagModalBtnClose');

// 19 位元狀態與保護定義 (依據明緯原廠 NTS,NTU-C.pdf 規格書第 37~39 頁定義 100% 精準對齊)
const bitDefinitions = [
  {
    idx: 0,
    name: "逆變輸出運作",
    desc: "逆變電路工作中 (INVERTER Mode)",
    cause: "逆變電路已成功啟動並輸出交流電",
    sop: "正常運行狀態。若需重設參數，請先確認後端負載安全。",
    isAlarm: false
  },
  {
    idx: 1,
    name: "UPS 市電旁路",
    desc: "負載由市電 Bypass 供應中 (Bypass Mode)",
    cause: "市電正常且機內旁路繼電器吸合，交流輸出直通市電",
    sop: "正常旁路供電，電池處於浮充或待機備援狀態。",
    isAlarm: false
  },
  {
    idx: 2,
    name: "市電輸入正常",
    desc: "市電輸入電壓正常在線 (Utility Power Supply)",
    cause: "偵測到 AC 110V 60Hz 市網輸入",
    sop: "正常市網輸入狀態，具備斷電切換 UPS 能力。",
    isAlarm: false
  },
  {
    idx: 3,
    name: "市電充電致能",
    desc: "市電充電迴路工作中 (Utility Charger Enable)",
    cause: "交流市電輸入正在向 12V 直流電池補充電力",
    sop: "充電進行中，請保持市電輸入穩定，避免中途強行斷電。",
    isAlarm: false
  },
  {
    idx: 4,
    name: "太陽能充電",
    desc: "太陽能充電輸入運作中 (Solar Charger Enable)",
    cause: "外接太陽能 MPPT 充電控制器正在為電池供電",
    sop: "太陽能綠能充電中，可搭配電池優先模式發揮最佳發電效益。",
    isAlarm: false
  },
  {
    idx: 5,
    name: "綠能節能模式",
    desc: "處於節能休眠模式 (Saving Mode Occurred)",
    cause: "DIP SW4 啟用節能模式且負載低於 10W 門檻",
    sop: "休眠待機中，當後端負載大於 10W 時會自動在 1 秒內喚醒輸出。",
    isAlarm: false
  },
  {
    idx: 6,
    name: "電池欠壓告警",
    desc: "電池電壓低於預警值 (Battery Exhausted Mode / Battery Low)",
    cause: "電池電量即將耗盡或大電流放電造成壓降 (12V 型號 <11.0V)",
    sop: "請盡速接上市電充電，或關閉非關鍵高耗電負載。",
    isAlarm: true
  },
  {
    idx: 7,
    name: "電池耗盡停機",
    desc: "電池沒電停機保護 (Shutdown Mode / Battery Used Up)",
    cause: "電池電壓低於停機下限 (12V 型號 <10.0V)，逆變器切斷以保護電池壽命",
    sop: "【停機保護】請立刻連接市電充電，充飽後方可重新啟動輸出。",
    isAlarm: true
  },
  {
    idx: 8,
    name: "電池過壓保護",
    desc: "電池輸入電壓過高保護 (Battery OVP)",
    cause: "外接發電機或充電器充電電壓異常飆高 (12V 型號 >15.5V)",
    sop: "請立即檢查並調低充電控制器輸出電壓，避免損壞逆變器輸入端濾波電容。",
    isAlarm: true
  },
  {
    idx: 9,
    name: "遙控關閉狀態",
    desc: "處於遠端通訊關閉狀態 (Remote Shutdown INVERTER)",
    cause: "已由遠端通訊發送 C 關機指令 (C100000000000000) 或機身 R.C. 端口短路遙控關閉",
    sop: "若需恢復輸出，請發送開機指令 C010000000000000 或將 R.C. 端口開路。",
    isAlarm: true
  },
  {
    idx: 10,
    name: "輕度過載警報",
    desc: "輸出負載達 100%~115% 額定容量 (OLP 100~115%)",
    cause: "後端電器連續負載功率略微超過額定容量 1200W",
    sop: "系統僅容許在 115% 運轉約 3 分鐘，請關閉次要設備以防超時保護關斷。",
    isAlarm: true
  },
  {
    idx: 11,
    name: "中度過載警報",
    desc: "輸出負載達 115%~150% 額定容量 (OLP 115~150%)",
    cause: "後端負載功率顯著超過額定值，功率開關元件應力與溫升急速攀升",
    sop: "系統將於 10 秒內緊急保護切斷輸出，請立即拔除非必要高耗能電器！",
    isAlarm: true
  },
  {
    idx: 12,
    name: "重度過載關斷",
    desc: "輸出負載大於 150% 極限關斷 (OLP 150%~)",
    cause: "負載端發生嚴重短路或超大馬達瞬間啟動湧浪電流",
    sop: "【緊急關斷】逆變電路已自動鎖定切斷輸出。請排除負載短路後重新冷啟動。",
    isAlarm: true
  },
  {
    idx: 13,
    name: "過溫/風扇異常",
    desc: "內部過溫保護 (OTP) 或散熱風扇堵轉 (Fan Lock Protection)",
    cause: "功率元件散熱片溫度超過上限 (>60°C) 或機殼散熱風扇積灰受阻轉速異常",
    sop: "請清除進出風口異物障礙，加強通風，待溫度降回正常範圍後將自動復原。",
    isAlarm: true
  },
  {
    idx: 14,
    name: "輸出欠壓保護",
    desc: "交流輸出電壓低於下限保護 (INV UVP Protection)",
    cause: "交流輸出端電壓異常下跌 (<85Vac) 或輸出負載嚴重拉垮",
    sop: "請檢查負載是否過重拉垮電壓，若無負載仍欠壓請聯絡原廠檢修。",
    isAlarm: true
  },
  {
    idx: 15,
    name: "輸出過壓保護",
    desc: "交流輸出電壓高於上限保護 (INV OVP Protection)",
    cause: "交流反饋電路異常或逆變輸出電壓過高 (>135Vac)",
    sop: "請立即切斷逆變輸出，重新冷啟動；若重啟仍過壓請送回明緯原廠檢修。",
    isAlarm: true
  },
  {
    idx: 16,
    name: "逆變硬體故障",
    desc: "逆變功率模組硬體嚴重故障告警 (INV Fault)",
    cause: "逆變輸出短路、功率開關元件 (MOSFET) 損壞或驅動晶片硬體故障",
    sop: "【硬體故障】請立即關閉機身總電源，切勿強行送電，聯絡原廠技術支援。",
    isAlarm: true
  },
  {
    idx: 17,
    name: "EEPROM 錯誤",
    desc: "機內儲存校正參數校驗錯誤 (EEPROM Error Code)",
    cause: "內部校正參數記憶體資料校驗碼 (CRC) 失敗",
    sop: "請發送 pU 參數解鎖，重新進行 V 輸出參數寫入重設。",
    isAlarm: true
  },
  {
    idx: 18,
    name: "系統綜合關機",
    desc: "系統安全保護停機狀態 (System Shutdown)",
    cause: "多重保護聯鎖觸發導致系統進入全面保護性關閉",
    sop: "請檢視上方各告警燈號，依個別 SOP 排除故障後重新啟動主機。",
    isAlarm: true
  }
];

function initDiagnosticGrid() {
  const grid = document.getElementById('diagnosticGrid');
  if (!grid) return;
  grid.innerHTML = bitDefinitions.map(b => `
    <div class="diag-item" id="diagBit_${b.idx}" onclick="openDiagModal(${b.idx})">
      <span class="diag-dot" id="dotBit_${b.idx}"></span>
      <div class="diag-content">
        <div class="diag-title-row">
          <span class="diag-bit">Bit ${b.idx}</span>
          <span class="diag-name">${b.name}</span>
        </div>
        <span class="diag-desc">${b.desc}</span>
        <span class="diag-action-hint">點擊查看排錯 SOP ➔</span>
      </div>
    </div>
  `).join('');
}
initDiagnosticGrid();

// 診斷 SOP Modal 彈窗控制
function openDiagModal(idx) {
  const def = bitDefinitions[idx];
  if (!def || !diagModal) return;

  const isActive = currentBitString.length > idx && currentBitString[idx] === '1';

  diagModalBitLabel.textContent = `Bit ${def.idx}`;
  diagModalName.textContent = def.name;
  diagModalDesc.textContent = def.desc;
  diagModalCause.textContent = def.cause;
  diagModalSop.textContent = def.sop;

  diagModalDot.className = 'diag-dot';
  if (isActive) {
    diagModalDot.classList.add(def.isAlarm ? 'active-alarm' : 'active-normal');
    diagModalStatusBadge.className = def.isAlarm ? 'status-pill pill-red' : 'status-pill pill-green';
    diagModalStatusBadge.textContent = def.isAlarm ? '⚠️ 異常觸發' : '⚡ 動作中';
  } else {
    diagModalStatusBadge.className = 'status-pill pill-cyan';
    diagModalStatusBadge.textContent = '● 正常閒置';
  }

  diagModal.classList.remove('hidden');
}

if (diagModalBtnClose) {
  diagModalBtnClose.addEventListener('click', () => diagModal.classList.add('hidden'));
}
if (diagModal) {
  diagModal.addEventListener('click', (e) => {
    if (e.target === diagModal) diagModal.classList.add('hidden');
  });
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && diagModal && !diagModal.classList.contains('hidden')) {
    diagModal.classList.add('hidden');
  }
});

// 檢查 Web Serial API 支援度與環境協定
const isLocalFile = window.location.protocol === 'file:';
const hasWebSerial = ('serial' in navigator) && !isLocalFile;

if (isLocalFile) {
  browserWarning.classList.remove('hidden');
  const warnText = document.getElementById('browserWarningText');
  if (warnText) {
    warnText.innerHTML = '⚠️ <strong>本機檔案限制提示</strong>：瀏覽器基於 W3C 安全規範禁止在本地檔案 (<code>file://</code>) 下存取硬體序列埠。若在本機運行，請雙擊根目錄下的 <code>start_web_local.bat</code>（自動啟動本機安全網頁伺服器）或使用 GitHub Pages 網址連線！已為您自動切換至展示模式。';
  }
  btnWebSerial.classList.add('hidden');
  startDemoMode();
} else if (!hasWebSerial) {
  browserWarning.classList.remove('hidden');
  btnWebSerial.classList.add('hidden');
  startDemoMode();
}

// 雙模式切換
tabMonitor.addEventListener('click', () => {
  tabMonitor.classList.add('active');
  tabEngineering.classList.remove('active');
  viewMonitor.classList.add('active');
  viewEngineering.classList.remove('active');
  drawTrendChart();
});

tabEngineering.addEventListener('click', () => {
  tabEngineering.classList.add('active');
  tabMonitor.classList.remove('active');
  viewEngineering.classList.add('active');
  viewMonitor.classList.remove('active');
});

// 連接 Web Serial 串口 (無限制過濾器，顯示所有可用串口包含 MOXA/FTDI/UNITEK)
btnWebSerial.addEventListener('click', async () => {
  if (!hasWebSerial) return;
  try {
    serialPort = await navigator.serial.requestPort();

    await serialPort.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      bufferSize: 255
    });

    // 強制拉高 DTR 與 RTS 信號 (為 MOXA TCC-82 光耦隔離器及 RS-232 埠供電)
    if (serialPort.setSignals) {
      try {
        await serialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
      } catch (sigErr) {
        console.warn('設置 DTR/RTS 信號警告:', sigErr);
      }
    }

    stopDemoMode();
    btnDisconnect.classList.remove('hidden');
    btnWebSerial.classList.add('hidden');
    rawDeviceInfo.textContent = 'Web Serial 實體串口已建立 (9600-8-N-1)';
    setConnectionStatus('已連線 (Web Serial)', true, false);

    startSerialPolling();
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      alert(`串口連線失敗: ${err.message}`);
    }
  }
});

// 斷開連線
btnDisconnect.addEventListener('click', async () => {
  await disconnectSerial();
});

async function disconnectSerial() {
  isPolling = false;
  lastValidPacketTime = 0;
  if (pollingTimer) clearInterval(pollingTimer);

  if (reader) {
    try { await reader.cancel(); reader.releaseLock(); } catch(e) {}
    reader = null;
  }
  if (writer) {
    try { writer.releaseLock(); } catch(e) {}
    writer = null;
  }
  if (serialPort) {
    try { await serialPort.close(); } catch(e) {}
    serialPort = null;
  }

  btnDisconnect.classList.add('hidden');
  btnWebSerial.classList.remove('hidden');
  setConnectionStatus('未連接', false, false);
}

// 動態輪詢計時器重設
function resetPollingTimer() {
  if (pollingTimer) clearInterval(pollingTimer);
  if (isPolling && writer) {
    pollingTimer = setInterval(async () => {
      if (!isPolling || !writer) return;
      try {
        const tStart = performance.now();
        const qBytes = new TextEncoder().encode('Q\r');
        await writer.write(qBytes);
        rawTxLine.textContent = 'Q\\r';
        lastPacketTime = tStart;

        // 若超過 1.5 秒未收到逆變器有效回覆，提示逾時與排錯方向
        if (lastValidPacketTime > 0 && performance.now() - lastValidPacketTime > 1500) {
          setConnectionStatus('等待逆變器回覆 (逾時)', true, true);
          if (rawRxLine.textContent === '--' || !rawRxLine.textContent.startsWith('(')) {
            rawRxLine.textContent = '(逾時無回應：請確認逆變器已開機通電，或將端子台 2 號橘線與 3 號棕線對調測試)';
          }
        }
      } catch(e) {
        setConnectionStatus('通訊發送異常', false, false);
      }
    }, selectedPollRateMs);
  } else if (isDemoMode) {
    pollingTimer = setInterval(() => {
      mockStep++;
      const simLoad = 30 + (mockStep % 20);
      const simVbat = (12.6 - ((mockStep % 15) * 0.1)).toFixed(1);
      const simTemp = (36.5 + ((mockStep % 8) * 0.5)).toFixed(1);
      const mockPacket = `(110.0 ${String(simLoad).padStart(3, '0')} ${simLoad}.0 ${simVbat} ${simTemp} 110.0 060.0 162.0 000 1011000000000000000)`;
      
      latencyVal.textContent = '12 ms';
      rawTxLine.textContent = 'Q\\r';
      rawRxLine.textContent = mockPacket;
      parseAndRender(mockPacket);
    }, selectedPollRateMs);
  }
}

// 實體串口輪詢循環
async function startSerialPolling() {
  isPolling = true;
  lastValidPacketTime = performance.now();
  reader = serialPort.readable.getReader();
  writer = serialPort.writable.getWriter();

  // 接收封包背景循環
  readSerialLoop();

  // 啟動定時輪詢
  resetPollingTimer();
}

async function readSerialLoop() {
  let buffer = '';
  const latin1Decoder = new TextDecoder('latin1');
  try {
    while (isPolling) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += latin1Decoder.decode(value);
        // 同時相容 \r, \n, \r\n 各種斷行字元
        let endIdx;
        while ((endIdx = buffer.search(/[\r\n]/)) !== -1) {
          const packet = buffer.substring(0, endIdx).trim();
          buffer = buffer.substring(endIdx + 1).replace(/^[\r\n]+/, '');

          if (packet.length === 0) continue;

          const latency = Math.round(performance.now() - lastPacketTime);
          latencyVal.textContent = `${latency} ms`;
          rawRxLine.textContent = packet;

          if (packet.startsWith('(') && packet.endsWith(')')) {
            lastValidPacketTime = performance.now();
            parseAndRender(packet);
            setConnectionStatus('正常運作', true, false);
          } else {
            // 所有非 Q 狀態字串 (如 I 指令回覆之設備型號版本、V 指令回覆) 均即時更新至設備資訊框
            deviceInfoBox.textContent = packet;
          }
        }
      }
    }
  } catch (err) {
    console.warn('串口讀取結束或中斷:', err);
  }
}

// 模擬模式切換
btnToggleDemo.addEventListener('click', () => {
  if (isDemoMode) stopDemoMode();
  else startDemoMode();
});

function startDemoMode() {
  isDemoMode = true;
  btnToggleDemo.classList.add('btn-primary');
  btnToggleDemo.classList.remove('btn-secondary');
  btnToggleDemo.textContent = '🎮 退出模擬';
  rawDeviceInfo.textContent = '離線模擬展示器 (Mock Inverter)';
  setConnectionStatus('模擬展示中', true, false);

  resetPollingTimer();
}

function stopDemoMode() {
  isDemoMode = false;
  btnToggleDemo.classList.remove('btn-primary');
  btnToggleDemo.classList.add('btn-secondary');
  btnToggleDemo.textContent = '🎮 模擬模式 (Demo)';
  if (pollingTimer) clearInterval(pollingTimer);
  if (!serialPort) setConnectionStatus('未連接', false, false);
}

// 計算並建構 V 指令 (NTS,NTU-C.pdf 第 35, 40, 50 頁規範: 11 Bytes, 包含 2-Byte Checksum)
function buildVCommandBytes(voltage, freq) {
  const vStr = String(voltage).padStart(3, '0');
  const fStr = String(freq).padStart(3, '0');
  // 依原廠規格：0:V, 1~3:WWW, 4:SP, 5~7:FFF, 8~9:Checksum, 10:CR
  const payloadStr = `V${vStr} ${fStr}`;
  const buffer = new Uint8Array(11);
  let sum = 0;
  for (let i = 0; i < payloadStr.length; i++) {
    const code = payloadStr.charCodeAt(i);
    buffer[i] = code;
    sum += code;
  }
  buffer[8] = (sum >> 8) & 0xFF; // Checksum High Byte
  buffer[9] = sum & 0xFF;        // Checksum Low Byte
  buffer[10] = 0x0D;             // CR
  return { buffer, hexChecksum: sum.toString(16).toUpperCase().padStart(4, '0'), vStr, fStr };
}

// 發送指令封包 (支援字串與二進制 Uint8Array，自動轉換相容 C 開關機規範)
async function sendCommand(cmdInput) {
  let bytesToSend;
  let displayStr = '';

  if (typeof cmdInput === 'string') {
    let cmdStr = cmdInput;
    // NTS,NTU-C.pdf 規格相容性轉換:
    // 將簡化格式 C 1 / C 0 自動升級為原廠 17 位元組完整標準幀
    if (cmdStr.trim() === 'C 1') {
      cmdStr = 'C010000000000000\r';
    } else if (cmdStr.trim() === 'C 0') {
      cmdStr = 'C100000000000000\r';
    } else if (!cmdStr.endsWith('\r')) {
      cmdStr += '\r';
    }
    displayStr = cmdStr.replace('\r', '\\r');
    bytesToSend = new TextEncoder().encode(cmdStr);
  } else if (cmdInput instanceof Uint8Array) {
    bytesToSend = cmdInput;
    displayStr = `[Raw Bytes len=${bytesToSend.length}]`;
  }

  rawTxLine.textContent = displayStr;

  if (isDemoMode) {
    if (displayStr.startsWith('I')) {
      deviceInfoBox.textContent = 'MEAN WELL NTU-1200-112US (FW: REV-1.02, 110Vac 60Hz 1200W)';
    }
    alert(`[模擬模式] 指令已成功模擬執行: ${displayStr.trim()}`);
    return;
  }

  if (!writer) {
    alert('尚未連接實體 USB 串口');
    return;
  }

  try {
    await writer.write(bytesToSend);
  } catch (err) {
    alert(`發送失敗: ${err.message}`);
  }
}

// 發送帶 2-Byte Checksum 的 V 指令 (NTS,NTU-C.pdf 標準)
async function sendVoltageFrequencyConfig(voltage, freq) {
  const { buffer, hexChecksum, vStr, fStr } = buildVCommandBytes(voltage, freq);
  rawTxLine.textContent = `V${vStr} ${fStr} [CS:0x${hexChecksum}]\\r`;

  // 1. 先送 pU 解鎖
  await sendCommand('pU\r');

  // 2. 依原廠規格等待 >= 20ms 後發送帶 Checksum 的 V 封包
  setTimeout(async () => {
    await sendCommand(buffer);
  }, 60);
}

// 解析 49 位元組 ASCII 封包並刷新 UI
function parseAndRender(rawStr) {
  const content = rawStr.substring(1, rawStr.length - 1).trim();
  const tokens = content.split(/\s+/);
  if (tokens.length < 10) return;

  const acOut = parseFloat(tokens[0]) || 0;
  const loadPct = parseInt(tokens[1]) || 0;
  const loadWatts = Math.round(loadPct * 12.0);

  // 依據明緯官方手冊第 5.4 節第 37/48 頁標準規格：
  // tokens[0]: VVV 交流輸出電壓 (0~250Vac)
  // tokens[1]: QQQ 數位輸出負載% (0~100%)
  // tokens[2]: SS.S 輸入電池電壓 (例如 12.6 或 48.3)
  // tokens[3]: BBB 電池容量比例 (例如 075 = 75%)
  // tokens[8]: PPP 類比輸出負載%
  // 雙模相容：若 tokens[2] 帶小數點則為標準電池電壓，否則回退相容舊格式
  let battVolt = 0;
  let battCapacity = 0;
  if (tokens[2] && tokens[2].includes('.')) {
    battVolt = parseFloat(tokens[2]) || 0;
    battCapacity = parseInt(tokens[3]) || 0;
  } else {
    battVolt = parseFloat(tokens[3]) || 0;
  }
  const temp = parseFloat(tokens[4]) || 0;
  const gridVolt = parseFloat(tokens[5]) || 0;
  const freq = parseFloat(tokens[6]) || 0;
  const dcBus = parseFloat(tokens[7]) || 0;

  const bitStr = tokens[9] || '';
  currentBitString = bitStr; // 儲存供 19-Bit 排錯 SOP Modal 隨時即時比對

  const invActive = bitStr[0] === '1';
  const utBypass = bitStr[1] === '1';
  const gridNorm = bitStr[2] === '1';
  const saving = bitStr[5] === '1';
  const fault = bitStr[16] === '1';
  const eepromErr = bitStr[17] === '1';

  // 數值顯示
  valBatVolt.textContent = battVolt.toFixed(1);
  flowBatVolt.textContent = `${battVolt.toFixed(1)} V`;
  valAcVolt.textContent = `${acOut.toFixed(1)} V`;
  valLoadWatts.textContent = `${loadWatts}`;
  flowLoadWatts.textContent = `${loadWatts} W`;
  valLoadPct.textContent = `${loadPct}`;
  flowLoadPct.textContent = `${loadPct} % 額定`;
  valTemp.textContent = `${temp.toFixed(1)}`;
  flowGridVal.textContent = `${gridVolt.toFixed(1)} V`;
  valFreq.textContent = `${freq.toFixed(1)} Hz`;
  flowGridFreq.textContent = `${freq.toFixed(1)} Hz`;
  valDcBus.textContent = `${dcBus.toFixed(1)} V`;
  flowDcBusVal.textContent = `${dcBus.toFixed(1)} V`;

  // 溫度進度條
  const tempPct = Math.min(100, Math.max(0, ((temp - 20) / 60) * 100));
  tempBarFill.style.width = `${tempPct}%`;

  // 動態門檻評估與告警連鎖
  let hasAlarm = false;
  let alarmMsg = '';

  // 1. 電池狀態判定 (對比使用者自訂門檻)
  if (battVolt <= lowBatCutoffThreshold) {
    batStatusTag.className = 'status-pill pill-red';
    batStatusTag.textContent = `低壓關斷 (≤${lowBatCutoffThreshold.toFixed(1)}V)`;
    flowBatStatus.textContent = '低壓關斷';
    hasAlarm = true;
    alarmMsg = `🚨 電池電壓 (${battVolt}V) 已低於自訂關斷門檻 (${lowBatCutoffThreshold.toFixed(1)}V)！`;
  } else if (battVolt <= lowBatWarnThreshold) {
    batStatusTag.className = 'status-pill pill-amber';
    batStatusTag.textContent = `低壓預警 (≤${lowBatWarnThreshold.toFixed(1)}V)`;
    flowBatStatus.textContent = '低壓預警';
    hasAlarm = true;
    alarmMsg = `⚠️ 電池電壓偏低 (${battVolt}V ≤ ${lowBatWarnThreshold.toFixed(1)}V)，請盡快充電。`;
  } else if (battVolt >= highBatWarnThreshold) {
    batStatusTag.className = 'status-pill pill-red';
    batStatusTag.textContent = `高壓過壓 (≥${highBatWarnThreshold.toFixed(1)}V)`;
    flowBatStatus.textContent = '高壓警告';
    hasAlarm = true;
    alarmMsg = `🚨 電池輸入電壓過高 (${battVolt}V ≥ ${highBatWarnThreshold.toFixed(1)}V)，請檢查充電迴路！`;
  } else {
    batStatusTag.className = 'status-pill pill-green';
    batStatusTag.textContent = '正常良好';
    flowBatStatus.textContent = '正常良好';
  }

  // 2. 負載過載判定 (對比自訂門檻)
  if (loadWatts >= overloadWarnThreshold) {
    loadStatusTag.className = 'status-pill pill-red';
    loadStatusTag.textContent = `過載警戒 (≥${overloadWarnThreshold}W)`;
    hasAlarm = true;
    alarmMsg = `🚨 負載功率 (${loadWatts}W) 超出自訂過載警戒門檻 (${overloadWarnThreshold}W)！`;
  } else {
    loadStatusTag.className = 'status-pill pill-cyan';
    loadStatusTag.textContent = '正常負載';
  }

  // 3. 散熱器溫度判定 (對比自訂門檻)
  if (temp >= tempWarnThreshold) {
    tempStatusTag.className = 'status-pill pill-red';
    tempStatusTag.textContent = `過溫警戒 (≥${tempWarnThreshold}°C)`;
    hasAlarm = true;
    alarmMsg = `🚨 散熱器溫度 (${temp}°C) 超出自訂過溫警戒 (${tempWarnThreshold}°C)！`;
  } else {
    tempStatusTag.className = 'status-pill pill-green';
    tempStatusTag.textContent = '散熱正常';
  }

  // 4. 硬體故障判定
  if (fault) {
    hasAlarm = true;
    alarmMsg = '🚨 逆變器回報硬體異常故障 (Inverter Fault)！請切換至工程模式檢視 Bit 16 排錯 SOP。';
  }

  // 告警顯示與蜂鳴器連動
  if (hasAlarm) {
    showAlert(alarmMsg);
    playAlertBeep(750, 0.28);
  } else {
    hideAlert();
  }

  // 電力潮流狀態
  if (fault) {
    powerPathBadge.textContent = '設備故障！';
    coreStatusText.textContent = '異常切斷';
  } else if (utBypass) {
    powerPathBadge.textContent = '市電直通旁路';
    coreStatusText.textContent = '市電直通旁路中';
    pathGridToBypass.style.opacity = '1';
    pathBatToInverter.style.opacity = '0.2';
    pathCoreToLoad.style.opacity = '1';
  } else if (invActive) {
    powerPathBadge.textContent = '電池逆變供電';
    coreStatusText.textContent = '電池逆變輸出中';
    pathGridToBypass.style.opacity = '0.2';
    pathBatToInverter.style.opacity = '1';
    pathCoreToLoad.style.opacity = '1';
  } else {
    powerPathBadge.textContent = '待機中';
    coreStatusText.textContent = '逆變器待機';
    pathGridToBypass.style.opacity = '0.2';
    pathBatToInverter.style.opacity = '0.2';
    pathCoreToLoad.style.opacity = '0.2';
  }

  // 旗標更新
  updateFlag(flagInverter, invActive);
  updateFlag(flagBypass, utBypass);
  updateFlag(flagGrid, gridNorm);
  updateFlag(flagSaving, saving);
  updateFlag(flagFault, fault, true);
  updateFlag(flagEeprom, eepromErr, true);

  // 19-Bit 診斷指示燈矩陣點陣刷新
  bitDefinitions.forEach(b => {
    const dot = document.getElementById(`dotBit_${b.idx}`);
    if (dot && bitStr.length > b.idx) {
      const isActive = bitStr[b.idx] === '1';
      dot.className = 'diag-dot';
      if (isActive) {
        dot.classList.add(b.isAlarm ? 'active-alarm' : 'active-normal');
      }
    }
  });

  // 繪製儀表量表 (動態套用自訂門檻)
  drawGauge(ctxBat, battVolt, 9.5, 16.5, lowBatWarnThreshold, lowBatCutoffThreshold, true);
  drawGauge(ctxLoad, loadWatts, 0, 1400, overloadWarnThreshold, 1380, false);

  // 加入歷史折線點
  historyPoints.push({ vbat: battVolt, watts: loadWatts });
  if (historyPoints.length > 60) historyPoints.shift();
  drawTrendChart();
}

function updateFlag(el, isActive, isError = false) {
  if (isActive) el.className = isError ? 'flag-item error' : 'flag-item active';
  else el.className = 'flag-item';
}

function setConnectionStatus(text, isOnline, isStale) {
  statusText.textContent = text;
  if (!isOnline) {
    statusBadge.className = 'status-badge badge-offline';
    latencyVal.textContent = '-- ms';
  } else if (isStale) {
    statusBadge.className = 'status-badge badge-stale';
  } else {
    statusBadge.className = 'status-badge badge-online';
  }
}

function showAlert(msg) {
  alertBanner.classList.remove('hidden');
  alertMessage.textContent = msg;
}
function hideAlert() {
  alertBanner.classList.add('hidden');
}

// 繪製圓弧儀表
function drawGauge(ctx, value, min, max, warnVal, dangerVal, isReverse) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h - 16;
  const radius = 80;
  const lineWidth = 14;

  ctx.clearRect(0, 0, w, h);

  // 底弧
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI, false);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  const clamped = Math.max(min, Math.min(max, value || min));
  const pct = (clamped - min) / (max - min);
  const endAngle = Math.PI + (pct * Math.PI);

  let strokeColor = '#10b981';
  if (!isReverse) {
    if (value >= dangerVal) strokeColor = '#ef4444';
    else if (value >= warnVal) strokeColor = '#f59e0b';
  } else {
    if (value <= dangerVal) strokeColor = '#ef4444';
    else if (value <= warnVal) strokeColor = '#f59e0b';
  }

  if (pct > 0.01) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, endAngle, false);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// 繪製 60 秒即時趨勢圖
function drawTrendChart() {
  const w = canvasChart.width;
  const h = canvasChart.height;
  ctxChart.clearRect(0, 0, w, h);

  if (historyPoints.length < 2) return;

  const padL = 40, padR = 40, padT = 20, padB = 25;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  // 格線
  ctxChart.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctxChart.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH / 4) * i;
    ctxChart.beginPath();
    ctxChart.moveTo(padL, y);
    ctxChart.lineTo(w - padR, y);
    ctxChart.stroke();
  }

  const stepX = chartW / (historyPoints.length - 1);

  // 電池電壓折線 (綠色)
  ctxChart.beginPath();
  ctxChart.strokeStyle = '#10b981';
  ctxChart.lineWidth = 2.5;
  historyPoints.forEach((pt, i) => {
    const x = padL + i * stepX;
    const v = Math.max(10, Math.min(16.5, pt.vbat || 10));
    const y = padT + chartH - ((v - 10) / 6.5) * chartH;
    if (i === 0) ctxChart.moveTo(x, y);
    else ctxChart.lineTo(x, y);
  });
  ctxChart.stroke();

  // 負載瓦數折線 (青色)
  ctxChart.beginPath();
  ctxChart.strokeStyle = '#06b6d4';
  ctxChart.lineWidth = 2.5;
  historyPoints.forEach((pt, i) => {
    const x = padL + i * stepX;
    const wVal = Math.max(0, Math.min(1400, pt.watts || 0));
    const y = padT + chartH - (wVal / 1400) * chartH;
    if (i === 0) ctxChart.moveTo(x, y);
    else ctxChart.lineTo(x, y);
  });
  ctxChart.stroke();
}

// 安全操作確認 Modal
function showConfirm(title, message, action) {
  modalTitle.textContent = title;
  modalBody.textContent = message;
  pendingConfirmAction = action;
  confirmModal.classList.remove('hidden');
}
modalBtnCancel.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
  pendingConfirmAction = null;
});
modalBtnConfirm.addEventListener('click', () => {
  if (pendingConfirmAction) pendingConfirmAction();
  confirmModal.classList.add('hidden');
  pendingConfirmAction = null;
});

// 工程應用模式按鈕事件
btnTurnOnAC.addEventListener('click', () => {
  showConfirm(
    '啟動逆變交流輸出',
    '即將向逆變器發送標準 17 位元組指令開啟 110V 輸出電源 (`C010000000000000`)。確定執行？',
    () => sendCommand('C010000000000000\r')
  );
});

btnTurnOffAC.addEventListener('click', () => {
  showConfirm(
    '⚠️ 危險操作：切斷交流電源',
    '即將向逆變器發送標準 17 位元組指令【切斷 110V 輸出】(`C100000000000000`)！後端所有電器負載將瞬間斷電，確定切斷？',
    () => sendCommand('C100000000000000\r')
  );
});

btnEnableSaving.addEventListener('click', () => {
  alert('依據明緯原廠 NTS,NTU-C.pdf 規格書第 43 頁備註：綠能節能模式 (Saving Mode) 係由機身 DIP SW4 硬體開關設定 (ON: 啟用節能, OFF: 關閉節能)。請直接將機身面板 DIP SW4 撥至 ON。');
});
btnDisableSaving.addEventListener('click', () => {
  alert('依據明緯原廠 NTS,NTU-C.pdf 規格書第 43 頁備註：請直接將機身面板 DIP SW4 撥至 OFF 關閉節能休眠。');
});
btnUnlock.addEventListener('click', () => sendCommand('pU\r'));

btnQueryInfo.addEventListener('click', async () => {
  deviceInfoBox.textContent = '正在發送 I 指令讀取設備資訊...';
  // 暫停 Q 輪詢 800ms，給予 I 指令獨立通訊窗口避免碰撞
  const wasPolling = isPolling;
  if (pollingTimer) clearInterval(pollingTimer);
  await sendCommand('I\r');
  setTimeout(() => {
    if (wasPolling && isPolling) resetPollingTimer();
  }, 800);
});

// 預設電壓頻率配置 (調用原廠 2-Byte Checksum V 指令)
document.querySelectorAll('.btn-voltage').forEach(btn => {
  btn.addEventListener('click', async () => {
    const v = parseInt(btn.getAttribute('data-v'));
    const f = parseInt(btn.getAttribute('data-f'));
    await sendVoltageFrequencyConfig(v, f);
  });
});

// 自訂電壓頻率配置套用
const btnApplyCustomV = document.getElementById('btnApplyCustomV');
const selectVoltage = document.getElementById('selectVoltage');
const selectFreq = document.getElementById('selectFreq');

if (btnApplyCustomV && selectVoltage && selectFreq) {
  btnApplyCustomV.addEventListener('click', async () => {
    const v = parseInt(selectVoltage.value);
    const f = parseInt(selectFreq.value);
    await sendVoltageFrequencyConfig(v, f);
  });
}

// 常用快捷指令群按鈕
document.querySelectorAll('.btn-quick-cmd').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.getAttribute('data-cmd');
    if (cmd) sendCommand(cmd);
  });
});

// 自訂指令發送
btnSendRaw.addEventListener('click', () => {
  const cmd = txtRawCmd.value.trim();
  if (cmd) sendCommand(cmd);
});
txtRawCmd.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const cmd = txtRawCmd.value.trim();
    if (cmd) sendCommand(cmd);
  }
});

// 一鍵工程情境切換事件監聽
document.getElementById('cardScenarioStandard')?.addEventListener('click', async () => {
  showConfirm(
    '套用標準商用情境 (110V/60Hz)',
    '系統將自動執行：解鎖 (pU) ➔ 設置 110V 60Hz (含 Checksum) ➔ 啟動輸出 (C010000000000000)。確定執行？',
    async () => {
      await sendVoltageFrequencyConfig(110, 60);
      setTimeout(async () => {
        await sendCommand('C010000000000000\r');
      }, 150);
    }
  );
});

document.getElementById('cardScenarioGreen')?.addEventListener('click', async () => {
  showConfirm(
    '套用綠能省電模式 (UPS)',
    '系統將自動執行：解鎖 (pU) ➔ 設置 110V 60Hz ➔ 啟動輸出 (C010000000000000)。請將 DIP SW4 撥至 ON 啟用節能。確定執行？',
    async () => {
      await sendVoltageFrequencyConfig(110, 60);
      setTimeout(async () => {
        await sendCommand('C010000000000000\r');
      }, 150);
    }
  );
});

document.getElementById('cardScenario120V')?.addEventListener('click', async () => {
  showConfirm(
    '套用北美大功率情境 (120V/60Hz)',
    '系統將自動執行：解鎖 (pU) ➔ 設置 120V 60Hz (含 Checksum) ➔ 啟動輸出 (C010000000000000)。確定執行？',
    async () => {
      await sendVoltageFrequencyConfig(120, 60);
      setTimeout(async () => {
        await sendCommand('C010000000000000\r');
      }, 150);
    }
  );
});

document.getElementById('cardScenario100V')?.addEventListener('click', async () => {
  showConfirm(
    '套用日本東部精密情境 (100V/50Hz)',
    '系統將自動執行：解鎖 (pU) ➔ 設置 100V 50Hz (含 Checksum) ➔ 啟動輸出 (C010000000000000)。確定執行？',
    async () => {
      await sendVoltageFrequencyConfig(100, 50);
      setTimeout(async () => {
        await sendCommand('C010000000000000\r');
      }, 150);
    }
  );
});

document.getElementById('cardScenarioEmergencyStop')?.addEventListener('click', () => {
  showConfirm(
    '🛑 緊急安全關斷',
    '【最高優先權操作】即將發送 C 0 切斷 110V 逆變輸出！後端負載將會立即斷電，確定切斷？',
    () => sendCommand('C 0\r')
  );
});

// 自訂安全門檻儲存與輪詢設定
const btnSaveSetpoints = document.getElementById('btnSaveSetpoints');
const setpointLowWarn = document.getElementById('setpointLowWarn');
const setpointLowCutoff = document.getElementById('setpointLowCutoff');
const setpointHighWarn = document.getElementById('setpointHighWarn');
const setpointOverload = document.getElementById('setpointOverload');
const setpointTemp = document.getElementById('setpointTemp');
const selectPollRate = document.getElementById('selectPollRate');
const chkAudioAlert = document.getElementById('chkAudioAlert');

if (btnSaveSetpoints) {
  btnSaveSetpoints.addEventListener('click', () => {
    lowBatWarnThreshold = parseFloat(setpointLowWarn.value) || 11.0;
    lowBatCutoffThreshold = parseFloat(setpointLowCutoff.value) || 10.0;
    highBatWarnThreshold = parseFloat(setpointHighWarn.value) || 15.5;
    overloadWarnThreshold = parseFloat(setpointOverload.value) || 1200.0;
    tempWarnThreshold = parseFloat(setpointTemp.value) || 55.0;
    selectedPollRateMs = parseInt(selectPollRate.value) || 500;
    isAudioAlertEnabled = chkAudioAlert.checked;

    resetPollingTimer();
    alert(`✅ 自訂安全門檻與通訊節奏已儲存生效！\n` +
          `• 低壓關斷門檻: ${lowBatCutoffThreshold.toFixed(1)} V\n` +
          `• 低壓預警門檻: ${lowBatWarnThreshold.toFixed(1)} V\n` +
          `• 高壓過壓門檻: ${highBatWarnThreshold.toFixed(1)} V\n` +
          `• 負載過載門檻: ${overloadWarnThreshold} W\n` +
          `• 散熱過溫門檻: ${tempWarnThreshold.toFixed(1)} °C\n` +
          `• 輪詢通訊週期: ${selectedPollRateMs} ms\n` +
          `• 異常蜂鳴警報: ${isAudioAlertEnabled ? '啟用' : '停用'}`);
  });
}

if (chkAudioAlert) {
  chkAudioAlert.addEventListener('change', () => {
    isAudioAlertEnabled = chkAudioAlert.checked;
  });
}

// 歷程 CSV 下載匯出
const btnExportCsv = document.getElementById('btnExportCsv');
if (btnExportCsv) {
  btnExportCsv.addEventListener('click', () => {
    if (historyPoints.length === 0) {
      alert('目前尚無即時遙測數據可匯出！請先連線或啟動模擬展示。');
      return;
    }
    let csv = '\uFEFF記錄時間,電池電壓_V,交流輸出瓦數_W,系統狀態\n';
    const now = new Date();
    historyPoints.forEach((pt, i) => {
      const timeStr = new Date(now.getTime() - (historyPoints.length - i) * selectedPollRateMs).toLocaleTimeString();
      csv += `"${timeStr}",${pt.vbat},${pt.watts},"正常運行"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NTU1200_WebHMI_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// 初始模擬示範啟動
if (!hasWebSerial) {
  startDemoMode();
}

// ==========================================
// PWA Service Worker 註冊與本機安裝管理
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] ServiceWorker 註冊成功，範圍 (Scope):', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] ServiceWorker 註冊失敗:', err);
      });
  });
}

// 監聽 PWA 可安裝事件 (beforeinstallprompt)
let deferredInstallPrompt = null;
const btnInstallPwa = document.getElementById('btnInstallPwa');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (btnInstallPwa) {
    btnInstallPwa.classList.remove('hidden');
  }
});

if (btnInstallPwa) {
  btnInstallPwa.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`[PWA] 使用者安裝選擇: ${outcome}`);
    deferredInstallPrompt = null;
    btnInstallPwa.classList.add('hidden');
  });
}

window.addEventListener('appinstalled', () => {
  console.log('[PWA] NTU-1200-112US 已成功安裝至本機！');
  if (btnInstallPwa) {
    btnInstallPwa.classList.add('hidden');
  }
});

