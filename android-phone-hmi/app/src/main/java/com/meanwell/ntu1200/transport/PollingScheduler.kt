package com.meanwell.ntu1200.transport

import android.util.Log
import com.meanwell.ntu1200.protocol.NtuCommandSpec
import com.meanwell.ntu1200.protocol.NtuPacketBuilder
import com.meanwell.ntu1200.protocol.NtuPacketParser
import com.meanwell.ntu1200.protocol.NtuTelemetryModel
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.IOException

sealed class CommandRequest {
    data class StatusQuery(val callback: ((NtuTelemetryModel?) -> Unit)? = null) : CommandRequest()
    data class DeviceInfoQuery(val callback: ((String?) -> Unit)? = null) : CommandRequest()
    data class WriteCommand(val payload: ByteArray, val isCritical: Boolean = true, val callback: ((Boolean) -> Unit)? = null) : CommandRequest()
}

class PollingScheduler(
    private val serialPortManager: SerialPortManager,
    private val scope: CoroutineScope
) {
    private val TAG = "PollingScheduler"

    private val ringBuffer = RingBuffer()
    private val mockTransport = MockTransport()

    private val _telemetryState = MutableStateFlow(NtuTelemetryModel.EMPTY)
    val telemetryState: StateFlow<NtuTelemetryModel> = _telemetryState.asStateFlow()

    private val _isDemoMode = MutableStateFlow(false)
    val isDemoMode: StateFlow<Boolean> = _isDemoMode.asStateFlow()

    // 統計數據
    val txCount = MutableStateFlow(0L)
    val rxCount = MutableStateFlow(0L)
    val timeoutCount = MutableStateFlow(0L)
    val lastRawTx = MutableStateFlow("")
    val lastRawRx = MutableStateFlow("")

    private val commandChannel = Channel<CommandRequest>(Channel.UNLIMITED)
    private var consecutiveTimeouts = 0
    private var job: Job? = null

    fun setDemoMode(enabled: Boolean) {
        _isDemoMode.value = enabled
    }

    fun start() {
        if (job?.isActive == true) return

        job = scope.launch(Dispatchers.IO) {
            val rxBuffer = ByteArray(128)
            var lastRequestTimestamp = 0L

            while (isActive) {
                // 優先檢查是否有排隊的指令 (如寫入或單發測試)，無則預設發送 Q 狀態輪詢
                val request = commandChannel.tryReceive().getOrNull() ?: CommandRequest.StatusQuery()

                // 強制執行請求間隔 >= 500ms
                val now = System.currentTimeMillis()
                val elapsed = now - lastRequestTimestamp
                if (elapsed < NtuCommandSpec.MIN_REQUEST_INTERVAL_MS) {
                    delay(NtuCommandSpec.MIN_REQUEST_INTERVAL_MS - elapsed)
                }

                if (_isDemoMode.value || !serialPortManager.isConnected.value) {
                    // 若處於 DEMO 模式或未插線，產生模擬資料或標示未連線
                    if (_isDemoMode.value) {
                        val mockData = mockTransport.generateMockTelemetry()
                        _telemetryState.value = mockData.copy(isStale = false, isConnected = true)
                    } else {
                        _telemetryState.value = _telemetryState.value.copy(isConnected = false, isStale = true)
                    }
                    lastRequestTimestamp = System.currentTimeMillis()
                    continue
                }

                // 實體硬體傳輸流程
                try {
                    when (request) {
                        is CommandRequest.StatusQuery -> {
                            val txBytes = NtuPacketBuilder.buildQueryStatusPacket()
                            lastRawTx.value = "Q\\r"
                            txCount.value++
                            val t0 = System.currentTimeMillis()

                            serialPortManager.write(txBytes)
                            lastRequestTimestamp = System.currentTimeMillis()

                            // 讀取回應 (逾時 150ms)
                            val bytesRead = serialPortManager.read(rxBuffer, NtuCommandSpec.READ_TIMEOUT_MS.toInt())
                            val t1 = System.currentTimeMillis()
                            val latency = (t1 - t0)

                            if (bytesRead > 0) {
                                val packets = ringBuffer.append(rxBuffer, bytesRead)
                                if (packets.isNotEmpty()) {
                                    val lastPacket = packets.last()
                                    lastRawRx.value = lastPacket
                                    rxCount.value++
                                    consecutiveTimeouts = 0

                                    val parsed = NtuPacketParser.parseStatusResponse(lastPacket, latency)
                                    if (parsed != null) {
                                        _telemetryState.value = parsed
                                        request.callback?.invoke(parsed)
                                    }
                                }
                            } else {
                                handleTimeout()
                                request.callback?.invoke(null)
                            }
                        }

                        is CommandRequest.DeviceInfoQuery -> {
                            val txBytes = NtuPacketBuilder.buildQueryInfoPacket()
                            lastRawTx.value = "I\\r"
                            txCount.value++
                            serialPortManager.write(txBytes)
                            lastRequestTimestamp = System.currentTimeMillis()

                            val bytesRead = serialPortManager.read(rxBuffer, NtuCommandSpec.READ_TIMEOUT_MS.toInt())
                            if (bytesRead > 0) {
                                val packets = ringBuffer.append(rxBuffer, bytesRead)
                                val resp = packets.lastOrNull()
                                lastRawRx.value = resp ?: ""
                                request.callback?.invoke(resp)
                            } else {
                                handleTimeout()
                                request.callback?.invoke(null)
                            }
                        }

                        is CommandRequest.WriteCommand -> {
                            // 寫入指令：單次發送、不自動重試
                            serialPortManager.write(request.payload)
                            lastRequestTimestamp = System.currentTimeMillis()
                            txCount.value++
                            lastRawTx.value = String(request.payload, Charsets.US_ASCII).replace("\r", "\\r")

                            // 封包最小間隔延遲 >= 10ms
                            delay(NtuCommandSpec.MIN_INTER_PACKET_DELAY_MS)
                            request.callback?.invoke(true)

                            // 寫入後立即排入一次 Q 狀態回讀驗證
                            commandChannel.send(CommandRequest.StatusQuery())
                        }
                    }
                } catch (e: IOException) {
                    Log.w(TAG, "通訊 I/O 異常: ${e.message}")
                    handleTimeout()
                }

                // 兩次封包最小間隔延遲
                delay(NtuCommandSpec.MIN_INTER_PACKET_DELAY_MS)
            }
        }
    }

    private fun handleTimeout() {
        timeoutCount.value++
        consecutiveTimeouts++
        if (consecutiveTimeouts >= 3) {
            // 連續 3 次逾時 (>1500ms)，保留最後數值但標記 STALE 資料過期
            _telemetryState.value = _telemetryState.value.copy(
                isStale = true,
                isConnected = false
            )
        }
    }

    fun postCommand(request: CommandRequest) {
        commandChannel.trySend(request)
    }

    fun stop() {
        job?.cancel()
        job = null
    }
}
