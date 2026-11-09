package ua.svitlo.widget

import android.content.Context
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.content.res.ResourcesCompat
import kotlin.math.ceil

/** Measure the same font and wrapping used by RemoteViews before choosing which rows fit. */
object WidgetLayout {
  fun height(context: Context, text: String, sp: Float, widthDp: Float): Int {
    if (text.isEmpty()) return 0
    val density = context.resources.displayMetrics.density
    val paint = TextPaint().apply {
      textSize = sp * context.resources.displayMetrics.scaledDensity
      typeface = ResourcesCompat.getFont(context, R.font.svitlo_inter)
    }
    val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, (widthDp * density).toInt().coerceAtLeast(1)).setAlignment(Layout.Alignment.ALIGN_NORMAL).setIncludePad(true).build()
    return ceil(layout.height / density).toInt()
  }
  fun fit(context: Context, rows: List<OutageRow>, widthDp: Float, availableDp: Int): VisibleRows {
    fun cost(row: OutageRow) = height(context, (if (row.current) "Зараз · " else "") + row.text, 12f, widthDp) + 8
    if (rows.sumOf { cost(it) } <= availableDp) return VisibleRows(rows, 0)
    var remaining = (availableDp - 36).coerceAtLeast(0)
    val selected = mutableListOf<OutageRow>()
    for (row in rows.filter { !it.past } + rows.filter { it.past }.asReversed()) {
      val height = cost(row)
      if (height > remaining) break
      selected += row; remaining -= height
    }
    return VisibleRows(selected.sortedBy { it.start }, rows.size - selected.size)
  }
}
