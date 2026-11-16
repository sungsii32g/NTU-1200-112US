package com.meanwell.ntu1200.protocol

import org.junit.Assert.*
import org.junit.Test

class NtuPacketParserTest {

    @Test
    fun testParseOfficialMeanwellManualSample() {
        // 依據 NTS,NTU-C.pdf 第 48 頁官方範例：
        val raw = "(230 025 48.3 075 20.0 000 50.0 000 023 1000000000000000000)\r"
        val model = NtuPacketParser.parseStatusResponse(raw, latencyMs = 12L)

        assertNotNull("Model should not be null", model)
        model?.let {
            assertTrue(it.isConnected)
            assertFalse(it.isStale)
            assertEquals(230.0f, it.acOutputVoltage.value ?: 0f, 0.01f)
            assertEquals(25, it.loadPercent.value)
            assertEquals(48.3f, it.batteryVoltage.value ?: 0f, 0.01f)
            assertEquals(75, it.batteryCapacityPercent.value)
            assertEquals(20.0f, it.temperature.value ?: 0f, 0.01f)
            assertEquals(0.0f, it.gridInputVoltage.value ?: 0f, 0.01f)
            assertEquals(50.0f, it.outputFrequency.value ?: 0f, 0.01f)
            assertEquals(0.0f, it.dcBusVoltage.value ?: 0f, 0.01f)
            assertEquals(23.0f, it.loadAnalogPercent.value ?: 0f, 0.01f)
            assertEquals(12L, it.latencyMs)

            // 狀態旗標
            assertEquals(true, it.isInverterActive.value)
            assertEquals(false, it.isUtilityBypass.value)
            assertEquals(PowerPath.INVERTER_BATTERY, it.powerPath)
            assertEquals(false, it.isFault.value)
        }
    }

    @Test
    fun testParseGridBypassGoldenSample() {
        // 舊版相容格式
        val raw = "(110.0 035 035.0 012.6 038.5 110.0 060.0 162.0 000 1011000000000000000)\r"
        val model = NtuPacketParser.parseStatusResponse(raw, latencyMs = 12L)

        assertNotNull("Model should not be null", model)
        model?.let {
            assertTrue(it.isConnected)
            assertFalse(it.isStale)
            assertEquals(110.0f, it.acOutputVoltage.value ?: 0f, 0.01f)
            assertEquals(35, it.loadPercent.value)
            assertEquals(12.6f, it.batteryVoltage.value ?: 0f, 0.01f)
            assertEquals(38.5f, it.temperature.value ?: 0f, 0.01f)
            assertEquals(110.0f, it.gridInputVoltage.value ?: 0f, 0.01f)
            assertEquals(60.0f, it.outputFrequency.value ?: 0f, 0.01f)
            assertEquals(PowerPath.INVERTER_BATTERY, it.powerPath)
        }
    }

    @Test
    fun testCommandFramesConformToOfficialSpec() {
        // C 指令標準 17 位元組幀格式 (手冊第 49 頁)
        val onCmd = NtuCommandSpec.buildOutputControlCmd(true)
        val offCmd = NtuCommandSpec.buildOutputControlCmd(false)
        assertEquals("C010000000000000\r", onCmd)
        assertEquals("C100000000000000\r", offCmd)

        // V 指令標準 11 位元組幀格式 (手冊第 35, 40 頁: V WWW FFF [CS_H][CS_L]\r)
        val vBytes = NtuCommandSpec.buildVoltageConfigCmdBytes(110, 60)
        assertEquals(11, vBytes.size)
        assertEquals('V'.code.toByte(), vBytes[0])
        assertEquals(0x0D.toByte(), vBytes[10]) // CR
    }

    @Test
    fun testParseMalformedPackets() {
        assertNull(NtuPacketParser.parseStatusResponse(""))
        assertNull(NtuPacketParser.parseStatusResponse("Invalid String"))
        assertNull(NtuPacketParser.parseStatusResponse("(110.0 035)")) // Too few tokens
    }
}
