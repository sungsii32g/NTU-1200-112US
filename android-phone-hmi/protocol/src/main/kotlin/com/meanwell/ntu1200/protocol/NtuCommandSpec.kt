package com.meanwell.ntu1200.protocol

/**
 * MEAN WELL NTU-1200-112US 通訊與電氣規格硬性常數定義
 * 依據原廠手冊第 5.4 節與 NTU-1200-112US 規格書核定
 */
object NtuCommandSpec {
    // 串列通訊參數 (9600-8-N-1)
    const val BAUD_RATE = 9600
    const val DATA_BITS = 8
    const val STOP_BITS = 1
    const val PARITY_NONE = 0
    const val DELIMITER_CR = "\r"
    const val DELIMITER_BYTE: Byte = 0x0D

    // 輪詢與通訊時序 (毫秒)
    const val MIN_REQUEST_INTERVAL_MS = 500L     // 兩次查詢間隔 >= 500ms
    const val MIN_INTER_PACKET_DELAY_MS = 10L    // 封包間隔延遲 >= 10ms
    const val TYPICAL_RESPONSE_TIME_MS = 15L     // 逆變器典型回應時間 <= 15ms
    const val READ_TIMEOUT_MS = 150L             // 讀取逾時等待 150ms
    const val STALE_THRESHOLD_MS = 1500L         // 逾期 1.5 秒 (連續 3 次未收到) 標記 STALE

    // NTU-1200-112US 直流電氣保護門檻 (單位: 伏特 V)
    const val DC_VOLTAGE_NOMINAL = 12.0f
    const val DC_VOLTAGE_MIN_NORMAL = 10.0f
    const val DC_VOLTAGE_MAX_NORMAL = 16.5f
    const val DC_LOW_ALARM = 11.0f               // 低壓預警 11.0V (±0.3V)
    const val DC_LOW_SHUTDOWN = 10.0f            // 低壓關斷 10.0V (±0.3V)
    const val DC_LOW_RESTART = 12.5f             // 低壓重啟 12.5V (±0.3V)
    const val DC_HIGH_ALARM = 15.5f              // 高壓預警 15.5V (±0.3V)
    const val DC_HIGH_SHUTDOWN = 16.5f           // 高壓關斷 16.5V (±0.3V)

    // 交流輸出規格
    const val AC_VOLTAGE_RATED = 110.0f          // 110Vac 美規
    const val AC_FREQUENCY_RATED = 60.0f         // 60Hz
    const val RATED_POWER_WATTS = 1200.0f        // 連續額定 1200W
    const val OVERLOAD_POWER_WATTS = 1380.0f     // 115% 輕度過載 (最長 3 分鐘)
    const val SURGE_POWER_WATTS = 2000.0f        // 峰值湧浪 (10 秒)

    // 指令字串語法
    const val CMD_QUERY_STATUS = "Q\r"
    const val CMD_QUERY_INFO = "I\r"
    const val CMD_PARAM_UNLOCK = "pU\r"
    
    fun buildOutputControlCmd(turnOn: Boolean): String {
        return if (turnOn) "C 1\r" else "C 0\r"
    }

    fun buildSavingModeCmd(enable: Boolean): String {
        return if (enable) "W 1\r" else "W 0\r"
    }
}
