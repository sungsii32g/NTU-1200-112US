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
let historyPoints = []; // 60s 趨勢圖 (vbat, watts)
let pendingConfirmAction = null;

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

// 檢查 Web Serial API 支援度
const hasWebSerial = 'serial' in navigator;
if (!hasWebSerial) {
  browserWarning.classList.remove('hidden');
  btnWebSerial.classList.add('hidden');
  // 自動進入模擬展示模式
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

// 連接 Web Serial 串口
btnWebSerial.addEventListener('click', async () => {
  if (!hasWebSerial) return;
  try {
    // 呼叫原生串口選擇器 (支援過濾常規串口 VID)
    serialPort = await navigator.serial.requestPort({
      filters: [
        { usbVendorId: 0x0403 }, // FTDI (FT232BL, FT232RL)
        { usbVendorId: 0x110A }, // MOXA (UPort 1110, 1150)
        { usbVendorId: 0x10C4 }, // Silicon Labs (CP2104, CP2102)
        { usbVendorId: 0x1A86 }, // WCH (CH340)
        { usbVendorId: 0x067B }  // Prolific (UNITEK PL2303)
      ]
    });

    await serialPort.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      bufferSize: 255
    });

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

// 實體串口輪詢循環
async function startSerialPolling() {
  isPolling = true;
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
  reader = textDecoder.readable.getReader();

  const textEncoder = new TextEncoderStream();
  const writableStreamClosed = textEncoder.readable.pipeTo(serialPort.writable);
  writer = textEncoder.writable.getWriter();

  // 接收封包背景循環
  readSerialLoop();

  // 定時 500ms 發送 Q\r 輪詢
  pollingTimer = setInterval(async () => {
    if (!isPolling || !writer) return;
    try {
      const tStart = performance.now();
      await writer.write('Q\r');
      rawTxLine.textContent = 'Q\\r';
      lastPacketTime = tStart;
    } catch(e) {
      setConnectionStatus('通訊發送異常', false, false);
    }
  }, 500);
}

async function readSerialLoop() {
  let buffer = '';
  try {
    while (isPolling) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        buffer += value;
        const crIdx = buffer.indexOf('\r');
        if (crIdx !== -1) {
          const packet = buffer.substring(0, crIdx).trim();
          buffer = buffer.substring(crIdx + 1);

          const latency = Math.round(performance.now() - lastPacketTime);
          latencyVal.textContent = `${latency} ms`;
          rawRxLine.textContent = packet;

          if (packet.startsWith('(') && packet.endsWith(')')) {
            parseAndRender(packet);
            setConnectionStatus('正常運作', true, false);
          } else if (packet.includes('MEAN WELL') || packet.includes('REV') || packet.length > 5) {
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

  if (pollingTimer) clearInterval(pollingTimer);
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
  }, 500);
}

function stopDemoMode() {
  isDemoMode = false;
  btnToggleDemo.classList.remove('btn-primary');
  btnToggleDemo.classList.add('btn-secondary');
  btnToggleDemo.textContent = '🎮 模擬模式 (Demo)';
  if (pollingTimer) clearInterval(pollingTimer);
  if (!serialPort) setConnectionStatus('未連接', false, false);
}

// 發送指令封包
async function sendCommand(cmdStr) {
  if (!cmdStr.endsWith('\r')) cmdStr += '\r';
  rawTxLine.textContent = cmdStr.replace('\r', '\\r');

  if (isDemoMode) {
    if (cmdStr.startsWith('I')) {
      deviceInfoBox.textContent = 'MEAN WELL NTU-1200-112US (FW: REV-1.02, 110Vac 60Hz 1200W)';
    }
    alert(`[模擬模式] 指令已成功模擬執行: ${cmdStr.trim()}`);
    return;
  }

  if (!writer) {
    alert('尚未連接實體 USB 串口');
    return;
  }

  try {
    await writer.write(cmdStr);
  } catch (err) {
    alert(`發送失敗: ${err.message}`);
  }
}

// 解析 49 位元組 ASCII 封包並刷新 UI
function parseAndRender(rawStr) {
  const content = rawStr.substring(1, rawStr.length - 1).trim();
  const tokens = content.split(/\s+/);
  if (tokens.length < 10) return;

  const acOut = parseFloat(tokens[0]) || 0;
  const loadPct = parseInt(tokens[1]) || 0;
  const loadWatts = Math.round(loadPct * 12.0);
  const battVolt = parseFloat(tokens[3]) || 0;
  const temp = parseFloat(tokens[4]) || 0;
  const gridVolt = parseFloat(tokens[5]) || 0;
  const freq = parseFloat(tokens[6]) || 0;
  const dcBus = parseFloat(tokens[7]) || 0;

  const bitStr = tokens[9] || '';
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

  // 電池狀態與告警
  if (battVolt < 10.0) {
    batStatusTag.className = 'status-pill pill-red';
    batStatusTag.textContent = '低壓關斷 (<10.0V)';
    flowBatStatus.textContent = '緊急關斷';
    showAlert(`🚨 電池電壓 (${battVolt}V) 已低於 10.0V 關斷門檻！`);
  } else if (battVolt < 11.0) {
    batStatusTag.className = 'status-pill pill-amber';
    batStatusTag.textContent = '低壓預警 (<11.0V)';
    flowBatStatus.textContent = '低壓預警';
    showAlert(`⚠️ 電池電壓偏低 (${battVolt}V)，請補充電力。`);
  } else {
    batStatusTag.className = 'status-pill pill-green';
    batStatusTag.textContent = '正常良好';
    flowBatStatus.textContent = '正常良好';
    if (!fault) hideAlert();
  }

  // 故障判定
  if (fault) {
    showAlert('🚨 逆變器回報硬體異常故障 (Inverter Fault)！');
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

  // 繪製儀表量表
  drawGauge(ctxBat, battVolt, 9.5, 16.5, 11.0, 10.0, true);
  drawGauge(ctxLoad, loadWatts, 0, 1400, 1200, 1380, false);

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
    '即將向逆變器發送指令開啟 110V 輸出電源 (`C 1`)。確定執行？',
    () => sendCommand('C 1\r')
  );
});

btnTurnOffAC.addEventListener('click', () => {
  showConfirm(
    '⚠️ 危險操作：切斷交流電源',
    '即將向逆變器發送指令【切斷 110V 輸出】(`C 0`)！後端所有電器負載將瞬間斷電，確定切斷？',
    () => sendCommand('C 0\r')
  );
});

btnEnableSaving.addEventListener('click', () => sendCommand('W 1\r'));
btnDisableSaving.addEventListener('click', () => sendCommand('W 0\r'));
btnUnlock.addEventListener('click', () => sendCommand('pU\r'));

btnQueryInfo.addEventListener('click', () => {
  sendCommand('I\r');
  deviceInfoBox.textContent = '正在發送 I 指令讀取設備資訊...';
});

// 預設電壓頻率配置
document.querySelectorAll('.btn-voltage').forEach(btn => {
  btn.addEventListener('click', async () => {
    const v = btn.getAttribute('data-v');
    const f = btn.getAttribute('data-f');
    // 自動解鎖並配置
    await sendCommand('pU\r');
    setTimeout(() => {
      sendCommand(`V ${v} ${f}\r`);
    }, 60);
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

// 初始模擬示範啟動
if (!hasWebSerial) {
  startDemoMode();
}
