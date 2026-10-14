package com.meanwell.ntu1200.transport

import com.meanwell.ntu1200.protocol.NtuPacketParser
import com.meanwell.ntu1200.protocol.NtuTelemetryModel
import kotlin.random.Random

/**
 * 離線測試與辦公室展示用之 Mock 模擬數據產生器
 */
class MockTransport {
    private var step = 0
    private var isSimulatingGridLoss = false

    fun toggleGridSimulation() {
        isSimulatingGridLoss = !isSimulatingGridLoss
    }

    fun generateMockTelemetry(): NtuTelemetryModel {
        step++
        val baseBatt = 12.6f + (Random.nextFloat() * 0.4f - 0.2f)
        val baseLoad = (35 + (Random.nextInt(10) - 5)).coerceIn(10, 80)
        val temp = 36.5f + (step % 20) * 0.1f

        val gridVolt = if (isSimulatingGridLoss) 0.0f else 110.0f
        val bypassBit = if (isSimulatingGridLoss) '0' else '1'
        val gridNormalBit = if (isSimulatingGridLoss) '0' else '1'

        // 格式：(110.0 035 035.0 012.6 038.5 110.0 060.0 162.0 000 1011000000000000000)
        val raw = String.format(
            "(110.0 %03d %04.1f %05.1f %04.1f %05.1f 060.0 162.0 000 1%c%c1000000000000000)\r",
            baseLoad,
            baseLoad.toFloat(),
            baseBatt,
            temp,
            gridVolt,
            bypassBit,
            gridNormalBit
        )

        return NtuPacketParser.parseStatusResponse(raw, latencyMs = 12L) ?: NtuTelemetryModel.EMPTY
    }
}
