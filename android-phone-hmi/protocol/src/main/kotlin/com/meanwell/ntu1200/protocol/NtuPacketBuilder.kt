package com.meanwell.ntu1200.protocol

/**
 * MEAN WELL ASCII 指令封包組裝器
 */
object NtuPacketBuilder {

    fun buildQueryStatusPacket(): ByteArray {
        return NtuCommandSpec.CMD_QUERY_STATUS.toByteArray(Charsets.US_ASCII)
    }

    fun buildQueryInfoPacket(): ByteArray {
        return NtuCommandSpec.CMD_QUERY_INFO.toByteArray(Charsets.US_ASCII)
    }

    fun buildUnlockPacket(): ByteArray {
        return NtuCommandSpec.CMD_PARAM_UNLOCK.toByteArray(Charsets.US_ASCII)
    }

    fun buildInverterOutputControlPacket(turnOn: Boolean): ByteArray {
        return NtuCommandSpec.buildOutputControlCmd(turnOn).toByteArray(Charsets.US_ASCII)
    }

    fun buildSavingModePacket(enable: Boolean): ByteArray {
        return NtuCommandSpec.buildSavingModeCmd(enable).toByteArray(Charsets.US_ASCII)
    }

    /**
     * 計算校驗碼 (ASCII 字元累加低 8 位元 Hex 字串)
     */
    fun calculateChecksum(commandPayload: String): String {
        var sum = 0
        for (ch in commandPayload) {
            sum += ch.code
        }
        val csByte = (sum and 0xFF)
        return String.format("%02X", csByte)
    }
}
