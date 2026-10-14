package com.meanwell.ntu1200.protocol

/**
 * MEAN WELL NTU-1200-112US 49 位元組 ASCII 回應封包解析器
 */
object NtuPacketParser {

    /**
     * 解析狀態查詢 'Q' 回應封包
     * 範例格式：(110.0 035 035.0 012.6 038.5 110.0 060.0 162.0 000 1011000000000000000)
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
            val loadWatts = if (loadPct != null) loadPct * (NtuCommandSpec.RATED_POWER_WATTS / 100.0f) else null
            val battVolt = tokens[3].toFloatOrNull()
            val temp = tokens[4].toFloatOrNull()
            val gridVolt = tokens[5].toFloatOrNull()
            val freq = tokens[6].toFloatOrNull()
            val dcBus = tokens[7].toFloatOrNull()

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
                loadPercent = Field(loadPct, "%", loadPct != null, nowMs),
                loadWatts = Field(loadWatts, "W", loadWatts != null, nowMs),
                batteryVoltage = Field(battVolt, "V", battVolt != null, nowMs),
                temperature = Field(temp, "°C", temp != null, nowMs),
                gridInputVoltage = Field(gridVolt, "V", gridVolt != null, nowMs),
                outputFrequency = Field(freq, "Hz", freq != null, nowMs),
                dcBusVoltage = Field(dcBus, "V", dcBus != null, nowMs),
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
