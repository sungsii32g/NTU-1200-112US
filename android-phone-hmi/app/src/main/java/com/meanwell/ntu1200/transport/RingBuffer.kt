package com.meanwell.ntu1200.transport

import java.io.ByteArrayOutputStream

/**
 * 針對 CR ('\r' / 0x0D) 換行定界的環形字串讀取緩衝區
 */
class RingBuffer(private val maxCapacity: Int = 1024) {
    private val buffer = ByteArrayOutputStream(maxCapacity)

    @Synchronized
    fun append(bytes: ByteArray, length: Int): List<String> {
        val completePackets = mutableListOf<String>()

        for (i in 0 until length) {
            val b = bytes[i]
            if (b.toInt() == 0x0D) { // '\r' 回車換行符號
                val packetBytes = buffer.toByteArray()
                buffer.reset()
                if (packetBytes.isNotEmpty()) {
                    val str = String(packetBytes, Charsets.US_ASCII).trim()
                    if (str.isNotEmpty()) {
                        completePackets.add(str)
                    }
                }
            } else if (b.toInt() != 0x0A) { // 忽略 '\n'
                if (buffer.size() < maxCapacity) {
                    buffer.write(b.toInt())
                } else {
                    buffer.reset() // 防止溢位清空
                }
            }
        }

        return completePackets
    }

    @Synchronized
    fun clear() {
        buffer.reset()
    }
}
