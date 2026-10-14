package com.meanwell.ntu1200.safety

/**
 * 安全功能開關旗標 (Capability Flags)
 * 第一階段預設唯讀鎖定，嚴防任何未經實機驗證之寫入操作
 */
object CapabilityFlags {
    // 總寫入開關 (第一版預設關閉)
    var isEngineeringControlUnlocked: Boolean = false

    // 各別指令開關
    var allowInverterOutputSwitch: Boolean = false  // C 指令
    var allowSavingModeSwitch: Boolean = false      // W 指令
    var allowVoltageFrequencyConfig: Boolean = false // V / pU 指令 (高風險，嚴格鎖定)

    fun canExecuteWrite(): Boolean {
        return isEngineeringControlUnlocked
    }
}
