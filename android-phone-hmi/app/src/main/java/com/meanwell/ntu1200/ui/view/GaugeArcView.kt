package com.meanwell.ntu1200.ui.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View

/**
 * 高效能自訂 Canvas 圓弧量表 View (完全相容 Android 5.0+ 與 120Hz 現代螢幕)
 */
class GaugeArcView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        color = Color.parseColor("#1B232E")
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        color = Color.parseColor("#00E676")
    }

    private val arcRect = RectF()
    private val startAngle = 135f
    private val totalSweep = 270f

    var minValue: Float = 0f
    var maxValue: Float = 100f
    var currentValue: Float = 0f
        set(value) {
            field = value.coerceIn(minValue, maxValue)
            postInvalidateOnAnimation()
        }

    var activeColor: Int = Color.parseColor("#00E676")
        set(value) {
            field = value
            progressPaint.color = value
            postInvalidateOnAnimation()
        }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val strokeWidth = w * 0.09f
        trackPaint.strokeWidth = strokeWidth
        progressPaint.strokeWidth = strokeWidth

        val padding = strokeWidth * 0.8f
        arcRect.set(padding, padding, w - padding, h - padding)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        // 1. 繪製底部圓弧軌道
        canvas.drawArc(arcRect, startAngle, totalSweep, false, trackPaint)

        // 2. 繪製當前進度圓弧
        val range = (maxValue - minValue).coerceAtLeast(1f)
        val sweepAngle = ((currentValue - minValue) / range) * totalSweep
        canvas.drawArc(arcRect, startAngle, sweepAngle, false, progressPaint)
    }
}
