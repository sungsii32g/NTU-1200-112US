package com.meanwell.ntu1200.ui

import android.os.Handler
import android.os.Looper
import android.view.View

/**
 * 60 秒無操作自動進入「微亮防烙印待機」保護層 (專為 AMOLED 螢幕設計)
 */
class BurnInProtector(
    private val overlayView: View,
    private val idleTimeoutMs: Long = 60_000L
) {
    private val handler = Handler(Looper.getMainLooper())
    private var isDimmed = false

    private val idleRunnable = Runnable {
        enterDimMode()
    }

    init {
        resetTimer()
    }

    fun onUserInteraction() {
        if (isDimmed) {
            exitDimMode()
        }
        resetTimer()
    }

    private fun resetTimer() {
        handler.removeCallbacks(idleRunnable)
        handler.postDelayed(idleRunnable, idleTimeoutMs)
    }

    private fun enterDimMode() {
        isDimmed = true
        overlayView.visibility = View.VISIBLE
        overlayView.alpha = 0f
        overlayView.animate().alpha(0.85f).setDuration(800).start()
    }

    private fun exitDimMode() {
        isDimmed = false
        overlayView.animate().alpha(0f).setDuration(300).withEndAction {
            overlayView.visibility = View.GONE
        }.start()
    }

    fun destroy() {
        handler.removeCallbacks(idleRunnable)
    }
}
