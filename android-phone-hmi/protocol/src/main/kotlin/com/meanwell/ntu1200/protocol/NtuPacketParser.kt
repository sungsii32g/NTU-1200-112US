package com.meanwell.ntu1200.protocol

/**
 * MEAN WELL NTU-1200-112US ASCII 回應封包解析器
 * 依據原廠手冊 5.4 節第 36~38 頁與第 48 頁標準規格核定
 */
object NtuPacketParser {

    /**
     * 解析狀態查詢 'Q' 回應封包
     * 原廠標準範例：(230 025 48.3 075 20.0 000 50.0 000 023 1000000000000000000)
     * 欄位依序：
     * tokens[0]: VVV 交流輸出電壓 (0~250Vac)
     * tokens[1]: QQQ 數位輸出負載% (0~100%)
     * tokens[2]: SS.S 輸入電池電壓 (例如 12.6 或 48.3)
     * tokens[3]: BBB 電池容量比例 (例如 075 = 75%)
     * tokens[4]: TT.T 散熱器溫度 (0~99.9°C)
     * tokens[5]: MMM 輸入市電電壓 (0~250Vac)
     * tokens[6]: RR.R 輸出頻率 (40.0~70.0Hz)
     * tokens[7]: DDD DC Bus 電壓 (0V 或高壓母線)
     * tokens[8]: PPP 類比輸出負載% (0~100%)
     * tokens[9]: b0~b18 19 位元二進制狀態字串
     */
    fun parseStatusResponse(rawPacket: String, latencyMs: Long = 0L, nowMs: Long = System.currentTimeMillis()): NtuTelemetryModel? {
        val trimmed = rawPacket.trim().replace("\r", "").replace("\n", "")
        if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) {
            return null
        }

        val content = trimmed.substring(1, trimmed.length - 1).trim()
        val tokens = content.split("\\s+".toRegex())

        // 必須至少有 10 個欄位 (9 個數值欄位 + 1 個 19 位元字串)
        if (tokens.size < 10) {
            return null
        }

        try {
            val acOut = tokens[0].toFloatOrNull()
            val loadPct = tokens[1].toIntOrNull()
            val loadAnalog = if (tokens.size > 8) tokens[8].toFloatOrNull() else null
            val effectiveLoad = loadAnalog ?: loadPct?.toFloat()
            // 依據手冊第 36 頁 tokens[8] 類比即時連續負載計算精確瓦數
            val loadWatts = if (effectiveLoad != null) effectiveLoad * (NtuCommandSpec.RATED_POWER_WATTS / 100.0f) else null
            
            // 雙模相容：若 tokens[2] 帶小數點則為標準電池電壓 SS.S，tokens[3] 為電池容量 BBB；否則兼容舊格式
            val battVolt: Float?
            val battCapacity: Int?
            if (tokens[2].contains('.')) {
                battVolt = tokens[2].toFloatOrNull()
                battCapacity = tokens[3].toIntOrNull()
            } else {
                battVolt = tokens[3].toFloatOrNull()
                battCapacity = null
            }

            val temp = tokens[4].toFloatOrNull()
            val gridVolt = tokens[5].toFloatOrNull()
            val freq = tokens[6].toFloatOrNull()
            val dcBus = tokens[7].toFloatOrNull()
            val loadAnalog = tokens[8].toFloatOrNull()

            val bitString = tokens[9]
            val invActive = if (bitString.length > 0) bitString[0] == '1' else null
            val utBypass = if (bitString.length > 1) bitString[1] == '1' else null
            val gridNorm = if (bitString.length > 2) bitString[2] == '1' else null
            val saving = if (bitString.length > 5) bitString[5] == '1' else null
            val fault = if (bitString.length > 16) bitString[16] == '1' else null
            val eepromErr = if (bitString.length > 17) bitString[17] == '1' else null

            // 電力路徑判斷
            val powerPath = when {
                fault == true -> PowerPath.FAULT
                utBypass == true -> PowerPath.UTILITY_BYPASS
                invActive == true -> PowerPath.INVERTER_BATTERY
                else -> PowerPath.INVERTER_STANDBY
            }

            // 電池狀態判定
            val battStatus = when {
                battVolt == null -> BatteryStatus.UNKNOWN
                battVolt < NtuCommandSpec.DC_LOW_SHUTDOWN -> BatteryStatus.LOW_SHUTDOWN
                battVolt < NtuCommandSpec.DC_LOW_ALARM -> BatteryStatus.LOW_ALARM
                battVolt > NtuCommandSpec.DC_HIGH_SHUTDOWN -> BatteryStatus.HIGH_SHUTDOWN
                battVolt > NtuCommandSpec.DC_HIGH_ALARM -> BatteryStatus.HIGH_ALARM
                else -> BatteryStatus.NORMAL
            }

            return NtuTelemetryModel(
                acOutputVoltage = Field(acOut, "V", acOut != null, nowMs),
                loadPercent = Field(effectiveLoad?.toInt() ?: loadPct, "%", (effectiveLoad != null || loadPct != null), nowMs),
                loadWatts = Field(loadWatts, "W", loadWatts != null, nowMs),
                batteryVoltage = Field(battVolt, "V", battVolt != null, nowMs),
                batteryCapacityPercent = Field(battCapacity, "%", battCapacity != null, nowMs),
                temperature = Field(temp, "°C", temp != null, nowMs),
                gridInputVoltage = Field(gridVolt, "V", gridVolt != null, nowMs),
                outputFrequency = Field(freq, "Hz", freq != null, nowMs),
                dcBusVoltage = Field(dcBus, "V", dcBus != null, nowMs),
                loadAnalogPercent = Field(loadAnalog, "%", loadAnalog != null, nowMs),
                loadAnalogPercent = Field(loadAnalog, "%", loadAnalog != null, nowMs),
                isInverterActive = Field(invActive, "", invActive != null, nowMs),
                isUtilityBypass = Field(utBypass, "", utBypass != null, nowMs),
                isGridNormal = Field(gridNorm, "", gridNorm != null, nowMs),
                isSavingMode = Field(saving, "", saving != null, nowMs),
                isFault = Field(fault, "", fault != null, nowMs),
                isEepromError = Field(eepromErr, "", eepromErr != null, nowMs),
                powerPath = powerPath,
                batteryStatus = battStatus,
                isConnected = true,
                isStale = false,
                rawString = rawPacket,
                latencyMs = latencyMs,
                lastUpdatedTimestamp = nowMs
            )
        } catch (e: Exception) {
            return null
        }
    }
}
