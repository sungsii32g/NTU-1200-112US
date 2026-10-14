package com.meanwell.ntu1200.ui.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import com.meanwell.ntu1200.protocol.PowerPath

/**
 * 自訂 Canvas 動態電力潮流視圖 (展示市電旁路 vs 電池逆變之能源流向)
 */
class PowerFlowView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 6f
        strokeCap = Paint.Cap.ROUND
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 28f
        textAlign = Paint.Align.CENTER
    }

    private val boxPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    var powerPath: PowerPath = PowerPath.UNKNOWN
        set(value) {
            field = value
            postInvalidateOnAnimation()
        }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return

        val gridY = h * 0.3f
        val battY = h * 0.7f
        val midX = w * 0.5f
        val outX = w * 0.85f

        // 1. 繪製市電路徑
        val isGridActive = powerPath == PowerPath.UTILITY_BYPASS
        linePaint.color = if (isGridActive) Color.parseColor("#00E676") else Color.parseColor("#37474F")
        canvas.drawLine(w * 0.15f, gridY, midX, gridY, linePaint)
        if (isGridActive) {
            canvas.drawLine(midX, gridY, outX, h * 0.5f, linePaint)
        }

        // 2. 繪製電池逆變路徑
        val isBattActive = powerPath == PowerPath.INVERTER_BATTERY
        linePaint.color = if (isBattActive) Color.parseColor("#00E5FF") else Color.parseColor("#37474F")
        canvas.drawLine(w * 0.15f, battY, midX, battY, linePaint)
        if (isBattActive) {
            canvas.drawLine(midX, battY, outX, h * 0.5f, linePaint)
        }

        // 3. 繪製節點標籤框
        drawNode(canvas, "市網輸入", w * 0.15f, gridY, if (isGridActive) "#1B5E20" else "#212121")
        drawNode(canvas, "電瓶輸入", w * 0.15f, battY, if (isBattActive) "#006064" else "#212121")
        drawNode(canvas, "AC 輸出負載", outX, h * 0.5f, "#263238")
    }

    private fun drawNode(canvas: Canvas, label: String, cx: Float, cy: Float, bgColorHex: String) {
        boxPaint.color = Color.parseColor(bgColorHex)
        val rect = RectF(cx - 75f, cy - 25f, cx + 75f, cy + 25f)
        canvas.drawRoundRect(rect, 8f, 8f, boxPaint)
        canvas.drawText(label, cx, cy + 10f, textPaint)
    }
}
