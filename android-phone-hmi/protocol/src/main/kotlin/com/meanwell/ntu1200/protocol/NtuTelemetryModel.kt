package com.meanwell.ntu1200.protocol

/**
 * 具有有效性與時間戳的遙測欄位包裝
 */
data class Field<T>(
    val value: T?,
    val unit: String = "",
    val isValid: Boolean = false,
    val timestampMs: Long = 0L
) {
    fun displayString(pattern: String = "%s", defaultText: String = "—"): String {
        return if (isValid && value != null) {
            String.format(pattern, value)
        } else {
            defaultText
        }
    }
}

enum class PowerPath {
    UNKNOWN,
    UTILITY_BYPASS,    // 市電直通旁路供電中 (UPS 旁路)
    INVERTER_BATTERY,  // 電池逆變供電中
    INVERTER_STANDBY,  // 逆變待命中 (無輸出)
    FAULT              // 故障保護中
}

enum class BatteryStatus {
    UNKNOWN,
    NORMAL,            // 11.0V ~ 15.5V
    LOW_ALARM,         // 10.0V ~ 11.0V (橘色預警)
    LOW_SHUTDOWN,      // < 10.0V (紅色關斷)
    HIGH_ALARM,        // 15.5V ~ 16.5V
    HIGH_SHUTDOWN      // > 16.5V
}

/**
 * NTU-1200-112US 遙測數據模型
 */
data class NtuTelemetryModel(
    val acOutputVoltage: Field<Float> = Field(null, "V"),
    val loadPercent: Field<Int> = Field(null, "%"),
    val loadWatts: Field<Float> = Field(null, "W"),
    val batteryVoltage: Field<Float> = Field(null, "V"),
    val temperature: Field<Float> = Field(null, "°C"),
    val gridInputVoltage: Field<Float> = Field(null, "V"),
    val outputFrequency: Field<Float> = Field(null, "Hz"),
    val dcBusVoltage: Field<Float> = Field(null, "V"),
    val isInverterActive: Field<Boolean> = Field(null),
    val isUtilityBypass: Field<Boolean> = Field(null),
    val isGridNormal: Field<Boolean> = Field(null),
    val isSavingMode: Field<Boolean> = Field(null),
    val isFault: Field<Boolean> = Field(null),
    val isEepromError: Field<Boolean> = Field(null),
    val powerPath: PowerPath = PowerPath.UNKNOWN,
    val batteryStatus: BatteryStatus = BatteryStatus.UNKNOWN,
    val isConnected: Boolean = false,
    val isStale: Boolean = true,
    val rawString: String = "",
    val latencyMs: Long = 0L,
    val lastUpdatedTimestamp: Long = 0L
) {
    companion object {
        val EMPTY = NtuTelemetryModel()
    }
}
