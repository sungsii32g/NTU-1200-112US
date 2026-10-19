/**
 * MEAN WELL NTU-1200-112US 舊筆電 / PC 工業級監控中心前端應用邏輯
 * 即時輪詢、Canvas 動態量表繪製、60 秒趨勢圖、電力潮流拓撲與安全互鎖
 */

// DOM 元素引用
const portSelect = document.getElementById('portSelect');
const btnConnect = document.getElementById('btnConnect');
const btnRefreshPorts = document.getElementById('btnRefreshPorts');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const latencyVal = document.getElementById('latencyVal');
const alertBanner = document.getElementById('alertBanner');
const alertMessage = document.getElementById('alertMessage');

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

// 控制按鈕與 Modal
const btnTurnOnAC = document.getElementById('btnTurnOnAC');
const btnTurnOffAC = document.getElementById('btnTurnOffAC');
const btnEnableSaving = document.getElementById('btnEnableSaving');
const btnDisableSaving = document.getElementById('btnDisableSaving');
const btnUnlock = document.getElementById('btnUnlock');

const confirmModal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalBtnCancel = document.getElementById('modalBtnCancel');
const modalBtnConfirm = document.getElementById('modalBtnConfirm');

// Canvas 元素
const canvasBat = document.getElementById('gaugeBattery');
const ctxBat = canvasBat.getContext('2d');
const canvasLoad = document.getElementById('gaugeLoad');
const ctxLoad = canvasLoad.getContext('2d');
const canvasChart = document.getElementById('trendChart');
const ctxChart = canvasChart.getContext('2d');

let pendingAction = null;
let lastAlertSpokenTime = 0;

// Web Audio 告警音效
function playBeep(freq = 880, duration = 0.25) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

// 繪製半圓弧儀表
function drawGauge(ctx, value, min, max, warnVal, dangerVal, unit, isReverseDanger = false) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h - 20;
  const radius = 80;
  const lineWidth = 14;

  ctx.clearRect(0, 0, w, h);

  // 背景底弧
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI, false);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 計算角度
  const clamped = Math.max(min, Math.min(max, value || min));
  const pct = (clamped - min) / (max - min);
  const endAngle = Math.PI + (pct * Math.PI);

  // 計算顏色
  let strokeColor = '#10b981'; // 綠色
  if (!isReverseDanger) {
    // 正常數值越大越危險 (例如負載、溫度)
    if (value >= dangerVal) strokeColor = '#ef4444';
    else if (value >= warnVal) strokeColor = '#f59e0b';
  } else {
    // 電池電壓：數值越小越危險
    if (value <= dangerVal) strokeColor = '#ef4444';
    else if (value <= warnVal) strokeColor = '#f59e0b';
  }

  // 繪製進度弧
  if (pct > 0.01) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, endAngle, false);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// 繪製 60 秒即時趨勢折線圖
function drawTrendChart(history) {
  const w = canvasChart.width;
  const h = canvasChart.height;
  ctxChart.clearRect(0, 0, w, h);

  if (!history || history.length < 2) {
    ctxChart.fillStyle = '#64748b';
    ctxChart.font = '14px Outfit';
    ctxChart.textAlign = 'center';
    ctxChart.fillText('正在收集遙測數據...', w / 2, h / 2);
    return;
  }

  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 25;
  const paddingBottom = 30;
  const chartW = w - paddingLeft - paddingRight;
  const chartH = h - paddingTop - paddingBottom;

  // 網格底線
  ctxChart.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctxChart.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (chartH / 4) * i;
    ctxChart.beginPath();
    ctxChart.moveTo(paddingLeft, y);
    ctxChart.lineTo(w - paddingRight, y);
    ctxChart.stroke();
  }

  // 坐標刻度標籤
  ctxChart.font = '11px JetBrains Mono';
  ctxChart.fillStyle = '#10b981';
  ctxChart.textAlign = 'right';
  ctxChart.fillText('16V', paddingLeft - 8, paddingTop + 5);
  ctxChart.fillText('10V', paddingLeft - 8, paddingTop + chartH);

  ctxChart.fillStyle = '#06b6d4';
  ctxChart.textAlign = 'left';
  ctxChart.fillText('1400W', w - paddingRight + 8, paddingTop + 5);
  ctxChart.fillText('0W', w - paddingRight + 8, paddingTop + chartH);

  const stepX = chartW / (history.length - 1);

  // 1. 繪製電池電壓折線 (綠色, 10V ~ 16V 範圍)
  ctxChart.beginPath();
  ctxChart.strokeStyle = '#10b981';
  ctxChart.lineWidth = 2.5;
  history.forEach((sample, i) => {
    const x = paddingLeft + i * stepX;
    const v = Math.max(10, Math.min(16.5, sample.v_bat || 10));
    const y = paddingTop + chartH - ((v - 10) / 6.5) * chartH;
    if (i === 0) ctxChart.moveTo(x, y);
    else ctxChart.lineTo(x, y);
  });
  ctxChart.stroke();

  // 2. 繪製負載功率折線 (青色, 0W ~ 1400W 範圍)
  ctxChart.beginPath();
  ctxChart.strokeStyle = '#06b6d4';
  ctxChart.lineWidth = 2.5;
  history.forEach((sample, i) => {
    const x = paddingLeft + i * stepX;
    const wVal = Math.max(0, Math.min(1400, sample.watts || 0));
    const y = paddingTop + chartH - (wVal / 1400) * chartH;
    if (i === 0) ctxChart.moveTo(x, y);
    else ctxChart.lineTo(x, y);
  });
  ctxChart.stroke();
}

// 刷新並填充通訊埠清單
async function loadPorts() {
  try {
    const res = await fetch('/api/ports');
    const data = await res.json();
    portSelect.innerHTML = '';
    
    // 預設選項
    const autoOpt = document.createElement('option');
    autoOpt.value = 'AUTO';
    autoOpt.textContent = '自動探測識別 (Auto-Detect)';
    portSelect.appendChild(autoOpt);

    data.ports.forEach(p => {
      if (p.port !== 'AUTO') {
        const opt = document.createElement('option');
        opt.value = p.port;
        opt.textContent = p.desc;
        portSelect.appendChild(opt);
      }
    });

    if (data.target) {
      portSelect.value = data.target;
    }
  } catch (e) {
    console.error('載入串口失敗:', e);
  }
}

// 狀態更新主循環
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    // 更新狀態徽章
    if (!data.is_connected) {
      statusBadge.className = 'status-badge badge-offline';
      statusText.textContent = data.mode === 'DISCONNECTED' ? '未連接' : '連線中斷';
      latencyVal.textContent = '-- ms';
    } else if (data.is_stale) {
      statusBadge.className = 'status-badge badge-stale';
      statusText.textContent = '數據逾期 (STALE)';
      latencyVal.textContent = `${data.latency_ms} ms`;
    } else {
      statusBadge.className = 'status-badge badge-online';
      statusText.textContent = data.mode === 'MOCK' ? '模擬模式中' : '連線正常';
      latencyVal.textContent = `${data.latency_ms} ms`;
    }

    rawDeviceInfo.textContent = data.active_device_name;
    rawTxLine.textContent = data.last_tx || 'Q\\r';
    rawRxLine.textContent = data.raw_packet || '無回應';

    const t = data.telemetry;
    const f = data.flags;

    // 更新各項數值
    valBatVolt.textContent = t.battery_voltage.toFixed(1);
    flowBatVolt.textContent = `${t.battery_voltage.toFixed(1)} V`;
    valAcVolt.textContent = `${t.ac_output_voltage.toFixed(1)} V`;
    valLoadWatts.textContent = `${t.load_watts.toFixed(0)}`;
    flowLoadWatts.textContent = `${t.load_watts.toFixed(0)} W`;
    valLoadPct.textContent = `${t.load_percent}`;
    flowLoadPct.textContent = `${t.load_percent} % 額定`;
    valTemp.textContent = `${t.temperature.toFixed(1)}`;
    flowGridVal.textContent = `${t.grid_input_voltage.toFixed(1)} V`;
    valFreq.textContent = `${t.output_frequency.toFixed(1)} Hz`;
    flowGridFreq.textContent = `${t.output_frequency.toFixed(1)} Hz`;
    valDcBus.textContent = `${t.dc_bus_voltage.toFixed(1)} V`;
    flowDcBusVal.textContent = `${t.dc_bus_voltage.toFixed(1)} V`;

    // 溫度進度條
    const tempPct = Math.min(100, Math.max(0, ((t.temperature - 20) / 60) * 100));
    tempBarFill.style.width = `${tempPct}%`;

    // 電池狀態判斷與告警
    if (data.battery_status === 'LOW_SHUTDOWN') {
      batStatusTag.className = 'status-pill pill-red';
      batStatusTag.textContent = '低壓關斷 (<10V)';
      flowBatStatus.textContent = '緊急低壓關斷';
      showAlert(`🚨 電池電壓過低 (${t.battery_voltage}V)！已低於 10.0V 關斷門檻！`);
    } else if (data.battery_status === 'LOW_ALARM') {
      batStatusTag.className = 'status-pill pill-amber';
      batStatusTag.textContent = '低壓預警 (<11V)';
      flowBatStatus.textContent = '低壓警告';
      showAlert(`⚠️ 電池電壓偏低 (${t.battery_voltage}V)，請準備充電。`);
    } else {
      batStatusTag.className = 'status-pill pill-green';
      batStatusTag.textContent = '正常良好';
      flowBatStatus.textContent = '正常良好';
      if (!f.fault) hideAlert();
    }

    // 故障與異常
    if (f.fault) {
      showAlert('🚨 逆變器回報系統異常故障 (Inverter Fault)！請檢查負載或散熱！');
      playBeep(440, 0.4);
    }

    // 繪製儀表量表
    drawGauge(ctxBat, t.battery_voltage, 9.5, 16.5, 11.0, 10.0, 'V', true);
    drawGauge(ctxLoad, t.load_watts, 0, 1400, 1200, 1380, 'W', false);

    // 更新電力潮流
    powerPathBadge.textContent = data.power_path;
    if (data.power_path === 'UTILITY_BYPASS') {
      coreStatusText.textContent = '市電直通旁路中';
      pathGridToBypass.style.opacity = '1';
      pathBatToInverter.style.opacity = '0.2';
      pathCoreToLoad.style.opacity = '1';
    } else if (data.power_path === 'INVERTER_BATTERY') {
      coreStatusText.textContent = '電池逆變輸出中';
      pathGridToBypass.style.opacity = '0.2';
      pathBatToInverter.style.opacity = '1';
      pathCoreToLoad.style.opacity = '1';
    } else {
      coreStatusText.textContent = '待機中';
      pathGridToBypass.style.opacity = '0.2';
      pathBatToInverter.style.opacity = '0.2';
      pathCoreToLoad.style.opacity = '0.2';
    }

    // 更新旗標項目
    updateFlag(flagInverter, f.inverter_active);
    updateFlag(flagBypass, f.utility_bypass);
    updateFlag(flagGrid, f.grid_normal);
    updateFlag(flagSaving, f.saving_mode);
    updateFlag(flagFault, f.fault, true);
    updateFlag(flagEeprom, f.eeprom_error, true);

  } catch (e) {
    statusBadge.className = 'status-badge badge-offline';
    statusText.textContent = '後端未響應';
  }
}

function updateFlag(el, isActive, isErrorType = false) {
  if (isActive) {
    el.className = isErrorType ? 'flag-item error' : 'flag-item active';
  } else {
    el.className = 'flag-item';
  }
}

function showAlert(msg) {
  alertBanner.classList.remove('hidden');
  alertMessage.textContent = msg;

  const now = Date.now();
  if (now - lastAlertSpokenTime > 15000) {
    playBeep(660, 0.3);
    lastAlertSpokenTime = now;
  }
}

function hideAlert() {
  alertBanner.classList.add('hidden');
}

// 載入歷史記錄並重繪趨勢圖
async function fetchHistory() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    drawTrendChart(data.history || []);
  } catch (e) {}
}

// 發送控制命令
async function sendControl(type, payload = {}) {
  try {
    const res = await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload })
    });
    const result = await res.json();
    alert(result.message || (result.success ? '執行成功' : '執行失敗'));
  } catch (e) {
    alert(`操作失敗: ${e}`);
  }
}

// 彈出確認 Modal
function showConfirm(title, message, action) {
  modalTitle.textContent = title;
  modalBody.textContent = message;
  pendingAction = action;
  confirmModal.classList.remove('hidden');
}

// 事件綁定
btnConnect.addEventListener('click', async () => {
  const selected = portSelect.value;
  try {
    await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port: selected })
    });
    fetchStatus();
  } catch (e) {
    alert('切換連接埠失敗');
  }
});

btnRefreshPorts.addEventListener('click', () => {
  loadPorts();
});

btnTurnOnAC.addEventListener('click', () => {
  showConfirm(
    '確認啟動逆變輸出',
    '即將向逆變器發送指令開啟 110V AC 輸出電源 (`C 1`)。確定執行？',
    () => sendControl('power', { turn_on: true })
  );
});

btnTurnOffAC.addEventListener('click', () => {
  showConfirm(
    '⚠️ 危險操作：切斷交流電源',
    '即將向逆變器發送指令【切斷 110V 輸出】(`C 0`)！後端所有電器負載將瞬間斷電，確定切斷？',
    () => sendControl('power', { turn_on: false })
  );
});

btnEnableSaving.addEventListener('click', () => {
  sendControl('saving', { enable: true });
});

btnDisableSaving.addEventListener('click', () => {
  sendControl('saving', { enable: false });
});

btnUnlock.addEventListener('click', () => {
  sendControl('unlock');
});

modalBtnCancel.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
  pendingAction = null;
});

modalBtnConfirm.addEventListener('click', () => {
  if (pendingAction) pendingAction();
  confirmModal.classList.add('hidden');
  pendingAction = null;
});

// 初始化啟動
loadPorts();
setInterval(fetchStatus, 500);
setInterval(fetchHistory, 1500);
