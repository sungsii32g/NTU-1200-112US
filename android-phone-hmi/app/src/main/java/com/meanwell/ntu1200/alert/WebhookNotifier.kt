package com.meanwell.ntu1200.alert

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Wi-Fi 遠端 Webhook 推播器 (支援 Telegram Bot / Line Notify / 自訂 HTTP POST)
 */
class WebhookNotifier {
    private val TAG = "WebhookNotifier"
    var webhookUrl: String? = null

    suspend fun sendPushNotification(message: String) {
        val targetUrl = webhookUrl ?: return
        withContext(Dispatchers.IO) {
            try {
                val url = URL(targetUrl)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.doOutput = true

                val jsonBody = "{\"text\": \"[NTU-1200] $message\"}"
                OutputStreamWriter(conn.outputStream, "UTF-8").use {
                    it.write(jsonBody)
                    it.flush()
                }

                val responseCode = conn.responseCode
                Log.d(TAG, "Webhook 推播回傳代碼: $responseCode")
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Webhook 推播失敗: ${e.message}")
            }
        }
    }
}
