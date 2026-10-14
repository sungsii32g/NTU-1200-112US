package com.meanwell.ntu1200.alert

import android.content.Context
import android.speech.tts.TextToSpeech
import android.util.Log
import java.util.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Android 原生 TTS 中文語音播報管理器
 * 具備警報等級冷卻抑制 (Cooldown)，避免連續發出重複語音噪音
 */
class TTSVoiceManager(context: Context) : TextToSpeech.OnInitListener {
    private val TAG = "TTSVoiceManager"
    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)
    private var isReady = false
    var isVoiceEnabled: Boolean = true

    // 冷卻時間戳映射表 (Key -> 上次播報毫秒)
    private val alertCooldownMap = ConcurrentHashMap<String, Long>()
    private val DEFAULT_COOLDOWN_MS = 30_000L // 30 秒抑制期

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.TAIWAN)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                // 嘗試通用中文
                tts?.setLanguage(Locale.CHINESE)
            }
            isReady = true
            Log.i(TAG, "TTS 語音模組初始化成功")
        } else {
            Log.w(TAG, "TTS 初始化失敗")
        }
    }

    /**
     * 播報警報語音 (帶冷卻抑制)
     */
    fun speakAlert(alertKey: String, speechText: String, cooldownMs: Long = DEFAULT_COOLDOWN_MS) {
        if (!isVoiceEnabled || !isReady) return

        val now = System.currentTimeMillis()
        val lastSpoken = alertCooldownMap[alertKey] ?: 0L
        if (now - lastSpoken < cooldownMs) {
            return // 處於冷卻期，略過重播
        }

        alertCooldownMap[alertKey] = now
        tts?.speak(speechText, TextToSpeech.QUEUE_ADD, null, alertKey)
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isReady = false
    }
}
