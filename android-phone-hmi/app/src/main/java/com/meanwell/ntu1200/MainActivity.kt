package com.meanwell.ntu1200

import android.graphics.Color
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import android.widget.ViewFlipper
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.meanwell.ntu1200.alert.AlertManager
import com.meanwell.ntu1200.alert.TTSVoiceManager
import com.meanwell.ntu1200.alert.WebhookNotifier
import com.meanwell.ntu1200.protocol.*
import com.meanwell.ntu1200.safety.CapabilityFlags
import com.meanwell.ntu1200.safety.SafetyLockManager
import com.meanwell.ntu1200.transport.CommandRequest
import com.meanwell.ntu1200.transport.PollingScheduler
import com.meanwell.ntu1200.transport.SerialPortManager
import com.meanwell.ntu1200.ui.BurnInProtector
import com.meanwell.ntu1200.ui.view.GaugeArcView
import com.meanwell.ntu1200.ui.view.PowerFlowView
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var serialPortManager: SerialPortManager
    private lateinit var pollingScheduler: PollingScheduler
    private lateinit var ttsVoiceManager: TTSVoiceManager
    private lateinit var webhookNotifier: WebhookNotifier
    private lateinit var alertManager: AlertManager
    private lateinit var safetyLockManager: SafetyLockManager
    private lateinit var burnInProtector: BurnInProtector

    // Views
    private lateinit var tvConnectionStatus: TextView
    private lateinit var tvPowerPathBadge: TextView
    private lateinit var tvClock: TextView
    private lateinit var btnToggleVoice: Button
    private lateinit var viewFlipper: ViewFlipper

    // Page 1 Dashboard views
    private lateinit var gaugeBattery: GaugeArcView
    private lateinit var tvBatteryVoltage: TextView
    private lateinit var tvBatteryStatusDesc: TextView
    private lateinit var powerFlowView: PowerFlowView
    private lateinit var tvTemperature: TextView
    private lateinit var gaugeLoad: GaugeArcView
    private lateinit var tvLoadPct: TextView
    private lateinit var tvAcOutputInfo: TextView
    private lateinit var tvLoadWatts: TextView

    // Debug views
    private lateinit var tvDebugSerialStats: TextView
    private lateinit var tvRawMonitor: TextView
    private lateinit var btnToggleDemoMode: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 螢幕常亮不休眠
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_main)

        initManagers()
        bindViews()
        setupListeners()
        startClock()
        observeData()

        // 嘗試自動連線 USB 串列埠
        serialPortManager.connectAvailableDevice()
        pollingScheduler.start()
    }

    private fun initManagers() {
        serialPortManager = SerialPortManager(this)
        pollingScheduler = PollingScheduler(serialPortManager, lifecycleScope)
        ttsVoiceManager = TTSVoiceManager(this)
        webhookNotifier = WebhookNotifier()
        alertManager = AlertManager(ttsVoiceManager, webhookNotifier, lifecycleScope)
        safetyLockManager = SafetyLockManager(this)

        val overlayView = findViewById<View>(R.id.viewBurnInOverlay)
        burnInProtector = BurnInProtector(overlayView, idleTimeoutMs = 60_000L)
    }

    private fun bindViews() {
        tvConnectionStatus = findViewById(R.id.tvConnectionStatus)
        tvPowerPathBadge = findViewById(R.id.tvPowerPathBadge)
        tvClock = findViewById(R.id.tvClock)
        btnToggleVoice = findViewById(R.id.btnToggleVoice)
        viewFlipper = findViewById(R.id.viewFlipper)

        gaugeBattery = findViewById(R.id.gaugeBattery)
        gaugeBattery.minValue = 10.0f
        gaugeBattery.maxValue = 16.5f

        tvBatteryVoltage = findViewById(R.id.tvBatteryVoltage)
        tvBatteryStatusDesc = findViewById(R.id.tvBatteryStatusDesc)
        powerFlowView = findViewById(R.id.powerFlowView)
        tvTemperature = findViewById(R.id.tvTemperature)

        gaugeLoad = findViewById(R.id.gaugeLoad)
        gaugeLoad.minValue = 0f
        gaugeLoad.maxValue = 100f

        tvLoadPct = findViewById(R.id.tvLoadPct)
        tvAcOutputInfo = findViewById(R.id.tvAcOutputInfo)
        tvLoadWatts = findViewById(R.id.tvLoadWatts)

        tvDebugSerialStats = findViewById(R.id.tvDebugSerialStats)
        tvRawMonitor = findViewById(R.id.tvRawMonitor)
        btnToggleDemoMode = findViewById(R.id.btnToggleDemoMode)
    }

    private fun setupListeners() {
        // 5 大導航頁面切換
        val navButtons = listOf(
            findViewById<Button>(R.id.navDashboard),
            findViewById<Button>(R.id.navTrends),
            findViewById<Button>(R.id.navControl),
            findViewById<Button>(R.id.navAlarms),
            findViewById<Button>(R.id.navDebug)
        )

        navButtons.forEachIndexed { index, button ->
            button.setOnClickListener {
                viewFlipper.displayedChild = index
                navButtons.forEachIndexed { i, btn ->
                    btn.setTextColor(if (i == index) Color.parseColor("#00E5FF") else Color.parseColor("#90A4AE"))
                }
            }
        }

        // 語音開關
        btnToggleVoice.setOnClickListener {
            ttsVoiceManager.isVoiceEnabled = !ttsVoiceManager.isVoiceEnabled
            btnToggleVoice.text = if (ttsVoiceManager.isVoiceEnabled) "語音: 開" else "語音: 關"
            btnToggleVoice.setTextColor(if (ttsVoiceManager.isVoiceEnabled) Color.parseColor("#00E5FF") else Color.parseColor("#757575"))
        }

        // Demo 模式切換
        btnToggleDemoMode.setOnClickListener {
            val nextState = !pollingScheduler.isDemoMode.value
            pollingScheduler.setDemoMode(nextState)
            btnToggleDemoMode.text = if (nextState) "關閉 DEMO 模擬" else "啟用 DEMO 模擬"
        }

        // 診斷頁單發測試按鈕
        findViewById<Button>(R.id.btnTestQueryStatus).setOnClickListener {
            pollingScheduler.postCommand(CommandRequest.StatusQuery { resp ->
                runOnUiThread {
                    Toast.makeText(this, "Q 查詢完成: ${resp?.batteryVoltage?.value ?: 0f}V", Toast.LENGTH_SHORT).show()
                }
            })
        }

        findViewById<Button>(R.id.btnTestQueryInfo).setOnClickListener {
            pollingScheduler.postCommand(CommandRequest.DeviceInfoQuery { resp ->
                runOnUiThread {
                    Toast.makeText(this, "I 查詢回傳: $resp", Toast.LENGTH_SHORT).show()
                }
            })
        }

        // 語音測試按鈕
        findViewById<Button>(R.id.btnTestTtsVoice).setOnClickListener {
            ttsVoiceManager.speakAlert("TEST", "明緯 NTU-1200 工業控制面板語音播報系統運作正常", 0L)
        }

        // 解鎖工程控制鎖
        findViewById<Button>(R.id.btnUnlockEngineering).setOnClickListener {
            CapabilityFlags.isEngineeringControlUnlocked = !CapabilityFlags.isEngineeringControlUnlocked
            val stateText = if (CapabilityFlags.isEngineeringControlUnlocked) "已解除 (可下發指令)" else "已鎖定 (唯讀安全)"
            Toast.makeText(this, "工程控制鎖：$stateText", Toast.LENGTH_LONG).show()
        }

        // 逆變開關控制 (受二次確認保護)
        findViewById<Button>(R.id.btnInverterSwitch).setOnClickListener {
            val currentState = pollingScheduler.telemetryState.value.isInverterActive.value ?: false
            val targetAction = if (currentState) "關閉逆變輸出" else "開啟逆變輸出"
            safetyLockManager.executeWithConfirmation(
                title = "二次確認：$targetAction",
                warningMessage = "您即將向 NTU-1200 下發 C 指令 $targetAction。若後端有高功率負載運轉，請確認是否安全？"
            ) {
                val cmdBytes = NtuPacketBuilder.buildInverterOutputControlPacket(!currentState)
                pollingScheduler.postCommand(CommandRequest.WriteCommand(cmdBytes))
                Toast.makeText(this, "指令已下發，立即回讀狀態...", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun observeData() {
        // 監聽遙測狀態
        lifecycleScope.launch {
            pollingScheduler.telemetryState.collectLatest { t ->
                updateUi(t)
                alertManager.evaluate(t)
            }
        }

        // 監聽通訊診斷統計
        lifecycleScope.launch {
            pollingScheduler.lastRawRx.collectLatest { rx ->
                val stats = "TX: ${pollingScheduler.txCount.value} | RX: ${pollingScheduler.rxCount.value} | 超時: ${pollingScheduler.timeoutCount.value} | 9600-8-N-1"
                tvDebugSerialStats.text = stats
                tvRawMonitor.text = "最新發送: ${pollingScheduler.lastRawTx.value}\n最新回傳: $rx"
            }
        }
    }

    private fun updateUi(t: NtuTelemetryModel) {
        // 1. 頂部狀態列
        if (pollingScheduler.isDemoMode.value) {
            tvConnectionStatus.text = "● 模擬展示 (DEMO)"
            tvConnectionStatus.setTextColor(Color.parseColor("#00E5FF"))
        } else if (t.isStale || !t.isConnected) {
            tvConnectionStatus.text = if (t.isStale) "⚠️ 資料過期" else "○ 尚未連線"
            tvConnectionStatus.setTextColor(Color.parseColor("#757575"))
        } else {
            tvConnectionStatus.text = "● 已連線 ${t.latencyMs}ms"
            tvConnectionStatus.setTextColor(Color.parseColor("#00E676"))
        }

        tvPowerPathBadge.text = when (t.powerPath) {
            PowerPath.UTILITY_BYPASS -> "路徑: 市電旁路 (UPS)"
            PowerPath.INVERTER_BATTERY -> "路徑: 電池逆變供電"
            PowerPath.FAULT -> "路徑: 故障異常"
            else -> "路徑: 待命"
        }

        // 2. 卡片 1 (電池)
        val battVolt = t.batteryVoltage.value
        tvBatteryVoltage.text = if (battVolt != null) String.format("%.1f V", battVolt) else "— V"
        gaugeBattery.currentValue = battVolt ?: 10f
        gaugeBattery.activeColor = when (t.batteryStatus) {
            BatteryStatus.NORMAL -> Color.parseColor("#00E676")
            BatteryStatus.LOW_ALARM -> Color.parseColor("#FF9100")
            BatteryStatus.LOW_SHUTDOWN -> Color.parseColor("#FF1744")
            else -> Color.parseColor("#757575")
        }
        tvBatteryStatusDesc.text = when (t.batteryStatus) {
            BatteryStatus.NORMAL -> "狀態: 正常 (10.0~16.5V)"
            BatteryStatus.LOW_ALARM -> "警告: 電池低壓預警 (<11.0V)"
            BatteryStatus.LOW_SHUTDOWN -> "危險: 電池低壓切斷 (<10.0V)"
            BatteryStatus.HIGH_ALARM -> "警告: 電池過壓預警 (>15.5V)"
            else -> "狀態: 未知"
        }

        // 3. 卡片 2 (電力潮流)
        powerFlowView.powerPath = t.powerPath
        val temp = t.temperature.value
        tvTemperature.text = if (temp != null) String.format("溫度: %.1f °C (正常)", temp) else "溫度: — °C"

        // 4. 卡片 3 (交流輸出)
        val loadPct = t.loadPercent.value
        tvLoadPct.text = if (loadPct != null) "$loadPct %" else "— %"
        gaugeLoad.currentValue = (loadPct ?: 0).toFloat()

        val acOut = t.acOutputVoltage.value
        val freq = t.outputFrequency.value
        tvAcOutputInfo.text = if (acOut != null && freq != null) {
            String.format("輸出: %.1f V / %.1f Hz", acOut, freq)
        } else {
            "輸出: — V / — Hz"
        }

        val watts = t.loadWatts.value
        tvLoadWatts.text = if (watts != null) {
            String.format("功率: %.0f W (額定1200W)", watts)
        } else {
            "功率: — W (額定1200W)"
        }
    }

    private fun startClock() {
        val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        lifecycleScope.launch {
            while (true) {
                tvClock.text = sdf.format(Date())
                delay(1000)
            }
        }
    }

    override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
        burnInProtector.onUserInteraction()
        return super.dispatchTouchEvent(ev)
    }

    override fun onDestroy() {
        super.onDestroy()
        pollingScheduler.stop()
        serialPortManager.destroy()
        ttsVoiceManager.shutdown()
        burnInProtector.destroy()
    }
}
