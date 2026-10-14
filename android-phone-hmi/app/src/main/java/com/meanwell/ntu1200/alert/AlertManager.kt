package com.meanwell.ntu1200.alert

import com.meanwell.ntu1200.protocol.BatteryStatus
import com.meanwell.ntu1200.protocol.NtuTelemetryModel
import com.meanwell.ntu1200.protocol.PowerPath
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class AlertManager(
    private val ttsVoiceManager: TTSVoiceManager,
    private val webhookNotifier: WebhookNotifier,
    private val scope: CoroutineScope
) {
    private var lastPowerPath: PowerPath? = null
    private var lastConnected: Boolean? = null

    fun evaluate(telemetry: NtuTelemetryModel) {
        // 1. 通訊中斷檢測
        if (lastConnected == true && (!telemetry.isConnected || telemetry.isStale)) {
            ttsVoiceManager.speakAlert("COMM_LOST", "通訊中斷，請檢查通訊線材與接線！")
        }
        lastConnected = telemetry.isConnected && !telemetry.isStale

        if (!telemetry.isConnected || telemetry.isStale) return

        // 2. 電池電壓警報
        when (telemetry.batteryStatus) {
            BatteryStatus.LOW_SHUTDOWN -> {
                val voltStr = telemetry.batteryVoltage.value?.let { String.format("%.1f", it) } ?: ""
                val msg = "緊急警告，電池電壓已降至 $voltStr 伏特，已達切斷門檻！"
                ttsVoiceManager.speakAlert("BATT_SHUTDOWN", msg, 15_000L)
                scope.launch { webhookNotifier.sendPushNotification(msg) }
            }
            BatteryStatus.LOW_ALARM -> {
                val voltStr = telemetry.batteryVoltage.value?.let { String.format("%.1f", it) } ?: ""
                val msg = "警告，電池電壓偏低，目前為 $voltStr 伏特，請注意電量！"
                ttsVoiceManager.speakAlert("BATT_LOW", msg, 30_000L)
            }
            BatteryStatus.HIGH_ALARM, BatteryStatus.HIGH_SHUTDOWN -> {
                ttsVoiceManager.speakAlert("BATT_HIGH", "警告，電池過電壓！", 30_000L)
            }
            else -> {}
        }

        // 3. 逆變故障
        if (telemetry.isFault.value == true) {
            val msg = "警報，逆變器內部保護觸發，發生故障！"
            ttsVoiceManager.speakAlert("INV_FAULT", msg, 20_000L)
            scope.launch { webhookNotifier.sendPushNotification(msg) }
        }

        // 4. 市電斷電切換至電池逆變
        if (lastPowerPath == PowerPath.UTILITY_BYPASS && telemetry.powerPath == PowerPath.INVERTER_BATTERY) {
            val msg = "注意，市電斷電，已無縫切換至電池逆變供電！"
            ttsVoiceManager.speakAlert("GRID_LOST", msg, 60_000L)
            scope.launch { webhookNotifier.sendPushNotification(msg) }
        }
        lastPowerPath = telemetry.powerPath
    }
}
