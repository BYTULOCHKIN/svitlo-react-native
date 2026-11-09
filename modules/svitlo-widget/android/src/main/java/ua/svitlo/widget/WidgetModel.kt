package ua.svitlo.widget

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

data class Span(val start: Long, val end: Long, val state: String)
data class Countdown(val label: String, val minutes: Long)
data class OutageRow(val start: Long, val end: Long, val state: String, val text: String, val current: Boolean, val past: Boolean)
data class VisibleRows(val rows: List<OutageRow>, val hidden: Int)

/** Pure projection of dated schedules and an injected clock; no Android/HTTP/storage dependency. */
object WidgetModel {
  fun dateOffset(now: Long, offset: Int): String = Calendar.getInstance(WidgetTime.zone).apply { timeInMillis = now; add(Calendar.DATE, offset) }.let { WidgetTime.date(it.timeInMillis) }
  fun midnight(date: String): Long = requireNotNull(SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = WidgetTime.zone; isLenient = false }.parse(date)).time
  fun endOfDate(date: String): Long = Calendar.getInstance(WidgetTime.zone).apply { timeInMillis = midnight(date); add(Calendar.DATE, 1) }.timeInMillis
  fun state(days: Map<String, WidgetDay>, queue: String, now: Long): String = spans(days, queue, now, now + 1).firstOrNull()?.state ?: "unknown"
  private fun datedSpans(day: WidgetDay, queue: String): List<Span> {
    val first = midnight(day.date)
    val last = endOfDate(day.date)
    val instants = arrayOfNulls<Long>(1441)
    val clock = Calendar.getInstance(WidgetTime.zone)
    var cursor = first
    while (cursor < last) {
      clock.timeInMillis = cursor
      val minute = clock.get(Calendar.HOUR_OF_DAY) * 60 + clock.get(Calendar.MINUTE)
      // Resolve repeated wall times to their first occurrence, matching server warning policy.
      if (instants[minute] == null) instants[minute] = cursor
      cursor += 60000
    }
    instants[1440] = last
    return day.slots(queue).mapNotNull {
      // A nonexistent spring start is not moved to an invented later outage.
      val start = instants[it.start] ?: return@mapNotNull null
      val end = (it.end..1440).firstNotNullOfOrNull { minute -> instants[minute] } ?: last
      if (end <= start) null else Span(start, end, it.state)
    }
  }
  fun spans(days: Map<String, WidgetDay>, queue: String, start: Long, end: Long): List<Span> {
    val candidates = days.values.filter { midnight(it.date) < end && endOfDate(it.date) > start }.flatMap { datedSpans(it, queue) }.sortedBy { it.start }
    val result = mutableListOf<Span>()
    fun append(from: Long, to: Long, state: String) {
      if (to <= from) return
      val previous = result.lastOrNull()
      if (previous?.state == state && previous.end == from) result[result.lastIndex] = previous.copy(end = to)
      else result += Span(from, to, state)
    }
    var cursor = start
    for (span in candidates) {
      val from = maxOf(start, span.start)
      val to = minOf(end, span.end)
      if (to <= cursor || to <= from) continue
      if (from > cursor) append(cursor, from, "unknown")
      append(maxOf(cursor, from), to, span.state)
      cursor = to
    }
    if (cursor < end) append(cursor, end, "unknown")
    return result
  }
  fun countdown(days: Map<String, WidgetDay>, queue: String, now: Long): Countdown? {
    val current = state(days, queue, now)
    if (current == "unknown") return null
    val next = spans(days, queue, now, endOfDate(dateOffset(now, 1))).drop(1).firstOrNull() ?: return null
    if (next.state == "unknown") return null
    val label = when {
      current == "off" && next.state == "on" -> "До відновлення"
      current == "possible" && next.state == "on" -> "До завершення можливого відключення"
      next.state == "off" -> "До відключення"
      current == "on" && next.state == "possible" -> "До можливого відключення"
      else -> "До зміни планового стану"
    }
    return Countdown(label, ((next.start - now + 59999) / 60000).coerceAtLeast(0))
  }
  fun duration(minutes: Long): String = if (minutes < 60) "${minutes} хв" else "${minutes / 60} год" + if (minutes % 60 > 0) " ${minutes % 60} хв" else ""
  fun rows(day: WidgetDay?, queue: String, now: Long): List<OutageRow> {
    if (day == null) return emptyList()
    val end = endOfDate(day.date)
    return spans(mapOf(day.date to day), queue, midnight(day.date), end).filter { it.state in listOf("off", "possible") }.map {
      val offsetChanged = WidgetTime.zone.getOffset(it.start) != WidgetTime.zone.getOffset(it.end - 1)
      fun ambiguous(time: Long): Boolean {
        val wall = WidgetTime.format("yyyy-MM-dd HH:mm", time)
        return listOf(time - 3600000, time + 3600000).any { other -> WidgetTime.format("yyyy-MM-dd HH:mm", other) == wall }
      }
      val showOffset = offsetChanged || ambiguous(it.start) || ambiguous(it.end - 1)
      val startText = WidgetTime.format(if (showOffset) "HH:mm XXX" else "HH:mm", it.start)
      val endText = if (it.end == end) "24:00" + if (showOffset) " ${WidgetTime.format("XXX", it.end - 1)}" else "" else WidgetTime.format(if (showOffset) "HH:mm XXX" else "HH:mm", it.end)
      val possible = if (it.state == "possible") "Можливе · " else ""
      OutageRow(it.start, it.end, it.state, "$possible$startText–$endText\n${duration((it.end - it.start) / 60000)}", now >= it.start && now < it.end, now >= it.end)
    }
  }
  fun visible(rows: List<OutageRow>, limit: Int): VisibleRows {
    val count = limit.coerceAtLeast(0)
    val chosen = if (rows.size <= count) rows else (rows.filter { !it.past } + rows.filter { it.past }.asReversed()).take(count).sortedBy { it.start }
    return VisibleRows(chosen, rows.size - chosen.size)
  }
}
