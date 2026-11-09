package ua.svitlo.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface

object WidgetTimeline {
  fun draw(days: Map<String, WidgetDay>, queue: String, now: Long, width: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(width.coerceIn(320, 1200), 168, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val left = 12f
    val right = bitmap.width - 12f
    val start = now - 2 * 3600000
    val end = now + 6 * 3600000
    fun x(time: Long) = left + (time - start).toFloat() / (end - start) * (right - left)
    val spans = WidgetModel.spans(days, queue, start, end)
    for (span in spans) {
      paint.color = Color.parseColor(when(span.state) { "off" -> "#FF8178"; "possible" -> "#FFC166"; "on" -> "#2ECC71"; else -> "#777777" })
      paint.alpha = if (span.state == "on") 35 else 85
      canvas.drawRoundRect(x(span.start), 38f, x(span.end), 100f, 9f, 9f, paint)
      paint.alpha = 255
      if (span.state != "on") {
        paint.style = Paint.Style.STROKE; paint.strokeWidth = 2f
        canvas.drawRoundRect(x(span.start) + 1, 39f, x(span.end) - 1, 99f, 9f, 9f, paint)
        paint.style = Paint.Style.FILL
      }
      if (span.state in listOf("possible", "unknown")) {
        paint.textSize = 22f; paint.textAlign = Paint.Align.CENTER
        if (x(span.end) - x(span.start) > 32) canvas.drawText(if (span.state == "possible") "?" else "—", (x(span.start) + x(span.end)) / 2, 78f, paint)
      }
    }
    paint.typeface = Typeface.create("sans-serif", Typeface.NORMAL)
    paint.textSize = 28f; paint.color = Color.parseColor("#B8B8B8")
    var time = (start / 3600000 + 1) * 3600000
    var lastLabelRight = left
    while (time < end) {
      val position = x(time)
      canvas.drawLine(position, 104f, position, 113f, paint)
      val label = WidgetTime.format("HH:mm", time)
      val labelWidth = paint.measureText(label)
      if (position - labelWidth / 2 >= lastLabelRight + 8 && position + labelWidth / 2 < right) {
        paint.textAlign = Paint.Align.CENTER
        canvas.drawText(label, position, 143f, paint)
        lastLabelRight = position + labelWidth / 2
      }
      time += 3600000
    }
    if (WidgetTime.zone.getOffset(start) != WidgetTime.zone.getOffset(end - 1)) {
      paint.textSize = 18f; paint.textAlign = Paint.Align.CENTER
      canvas.drawText("Київ · UTC${WidgetTime.format("XXX", start)} → UTC${WidgetTime.format("XXX", end - 1)}", bitmap.width / 2f, 165f, paint)
    }
    paint.color = Color.parseColor("#F5F5F5"); paint.strokeWidth = 2f
    canvas.drawLine(x(now), 27f, x(now), 112f, paint)
    paint.textAlign = Paint.Align.CENTER; paint.textSize = 22f
    canvas.drawText("зараз", x(now), 21f, paint)
    return bitmap
  }
  fun description(days: Map<String, WidgetDay>, queue: String, now: Long): String = "Найближчі години. " + WidgetModel.spans(days, queue, now - 2 * 3600000, now + 6 * 3600000).joinToString(". ") {
    "${WidgetTime.format("dd.MM HH:mm XXX", it.start)}–${WidgetTime.format("HH:mm XXX", it.end)}: " + when(it.state) { "on" -> "увімкнено"; "off" -> "відключення"; "possible" -> "можливе відключення"; else -> "немає даних" }
  }
}
