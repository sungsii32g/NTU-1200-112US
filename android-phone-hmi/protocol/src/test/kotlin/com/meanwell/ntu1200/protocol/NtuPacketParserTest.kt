package com.meanwell.ntu1200.protocol

import org.junit.Assert.*
import org.junit.Test

class NtuPacketParserTest {

    @Test
    fun testParseGridBypassGoldenSample() {
        val raw = "(110.0 035 035.0 012.6 038.5 110.0 060.0 162.0 000 1011000000000000000)\r"
        val model = NtuPacketParser.parseStatusResponse(raw, latencyMs = 12L)

        assertNotNull("Model should not be null", model)
        model?.let {
            assertTrue(it.isConnected)
            assertFalse(it.isStale)
            assertEquals(110.0f, it.acOutputVoltage.value ?: 0f, 0.01f)
            assertEquals(35, it.loadPercent.value)
            assertEquals(420.0f, it.loadWatts.value ?: 0f, 0.01f)
            assertEquals(12.6f, it.batteryVoltage.value ?: 0f, 0.01f)
            assertEquals(38.5f, it.temperature.value ?: 0f, 0.01f)
            assertEquals(110.0f, it.gridInputVoltage.value ?: 0f, 0.01f)
            assertEquals(60.0f, it.outputFrequency.value ?: 0f, 0.01f)
            assertEquals(12L, it.latencyMs)

            // 狀態旗標
            assertEquals(true, it.isInverterActive.value)
            assertEquals(false, it.isUtilityBypass.value) // Bit 1 is 0
            assertEquals(PowerPath.INVERTER_BATTERY, it.powerPath)
            assertEquals(BatteryStatus.NORMAL, it.batteryStatus)
            assertEquals(false, it.isFault.value)
        }
    }

    @Test
    fun testParseTrueUtilityBypassMode() {
        // Bit 0 = 1, Bit 1 = 1 (Utility bypass), Bit 2 = 1 (Grid normal)
        val raw = "(110.0 025 025.0 013.2 035.0 110.0 060.0 160.0 000 1110000000000000000)\r"
        val model = NtuPacketParser.parseStatusResponse(raw, latencyMs = 10L)

        assertNotNull(model)
        model?.let {
            assertEquals(PowerPath.UTILITY_BYPASS, it.powerPath)
            assertEquals(BatteryStatus.NORMAL, it.batteryStatus)
            assertEquals(300.0f, it.loadWatts.value ?: 0f, 0.01f)
        }
    }

    @Test
    fun testParseLowBatteryWarning() {
        // Battery = 10.8V (< 11.0V)
        val raw = "(110.0 010 010.0 010.8 040.0 000.0 060.0 155.0 000 1000000000000000000)\r"
        val model = NtuPacketParser.parseStatusResponse(raw)

        assertNotNull(model)
        model?.let {
            assertEquals(BatteryStatus.LOW_ALARM, it.batteryStatus)
            assertEquals(PowerPath.INVERTER_BATTERY, it.powerPath)
        }
    }

    @Test
    fun testParseInverterFault() {
        // Bit 16 = 1 (Fault)
        val raw = "(000.0 000 000.0 012.0 055.0 110.0 000.0 000.0 000 0010000000000000100)\r"
        val model = NtuPacketParser.parseStatusResponse(raw)

        assertNotNull(model)
        model?.let {
            assertEquals(PowerPath.FAULT, it.powerPath)
            assertEquals(true, it.isFault.value)
        }
    }

    @Test
    fun testParseMalformedPackets() {
        assertNull(NtuPacketParser.parseStatusResponse(""))
        assertNull(NtuPacketParser.parseStatusResponse("Invalid String"))
        assertNull(NtuPacketParser.parseStatusResponse("(110.0 035)")) // Too few tokens
    }
}
