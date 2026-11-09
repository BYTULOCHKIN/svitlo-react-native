package ua.svitlo.widget

import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.TimeZone

class WidgetModelTest {
  private fun time(value: String): Long = SimpleDateFormat("yyyy-MM-dd HH:mm").apply { timeZone = WidgetTime.zone }.parse(value)!!.time
  private fun day(date: String, vararg slots: Slot) = WidgetDay(date, mapOf("1.1" to slots.toList()), false, 1)
  @Test fun `off continues through midnight with one restoration countdown`() {
    val days = mapOf("2026-11-09" to day("2026-11-09", Slot(0, 1380, "on"), Slot(1380, 1440, "off")), "2026-11-10" to day("2026-11-10", Slot(0, 60, "off"), Slot(60, 1440, "on")))
    val result = WidgetModel.countdown(days, "1.1", time("2026-11-09 23:30"))!!
    assertEquals("До відновлення", result.label); assertEquals(90L, result.minutes)
    assertNull(WidgetModel.countdown(days - "2026-11-10", "1.1", time("2026-11-09 23:30")))
  }
  @Test fun `current boundary missing queue and possible state do not invent power`() {
    val today = day("2026-11-09", Slot(0, 600, "off"), Slot(600, 660, "possible"), Slot(660, 1440, "on"))
    val days = mapOf(today.date to today)
    assertEquals("possible", WidgetModel.state(days, "1.1", time("2026-11-09 10:00")))
    assertEquals("unknown", WidgetModel.state(days, "2.1", time("2026-11-09 10:00")))
    assertEquals("До зміни планового стану", WidgetModel.countdown(days, "1.1", time("2026-11-09 09:30"))?.label)
    assertEquals(30L, WidgetModel.countdown(days, "1.1", time("2026-11-09 10:30"))?.minutes)
  }
  @Test fun `eight real hours crosses dates and marks missing portions unknown`() {
    val now = time("2026-11-10 01:00")
    val today = day("2026-11-10", Slot(0, 1440, "on"))
    val spans = WidgetModel.spans(mapOf(today.date to today), "1.1", now - 2 * 3600000, now + 6 * 3600000)
    assertEquals(listOf("unknown", "on"), spans.map { it.state })
    assertEquals(8 * 3600000L, spans.sumOf { it.end - it.start })
  }
  @Test fun `DST days have real duration without fabricating local hours`() {
    assertEquals(23 * 3600000L, WidgetModel.endOfDate("2026-03-29") - WidgetModel.midnight("2026-03-29"))
    assertEquals(25 * 3600000L, WidgetModel.endOfDate("2026-10-25") - WidgetModel.midnight("2026-10-25"))
    val today = day("2026-10-25", Slot(0, 1440, "off"))
    assertTrue(WidgetModel.rows(today, "1.1", time("2026-10-25 12:00")).single().text.endsWith("25 год"))
  }
  @Test fun `overflow prioritises current and future and counts every hidden row`() {
    val rows = listOf(
      OutageRow(0, 1, "off", "past1", false, true),
      OutageRow(2, 3, "off", "past2", false, true),
      OutageRow(4, 5, "off", "current", true, false),
      OutageRow(6, 7, "off", "future", false, false)
    )
    val visible = WidgetModel.visible(rows, 2)
    assertEquals(listOf("current", "future"), visible.rows.map { it.text }); assertEquals(2, visible.hidden)
    assertEquals(4, WidgetModel.visible(rows, 10).rows.size)
  }

  @Test fun `autumn repeated hour does not split one planned outage into two`() {
    val today = day("2026-10-25", Slot(0, 210, "on"), Slot(210, 240, "off"), Slot(240, 1440, "on"))
    val rows = WidgetModel.rows(today, "1.1", time("2026-10-25 12:00"))
    assertEquals(1, rows.size)
    assertEquals(90 * 60000L, rows.single().end - rows.single().start)
    assertTrue(rows.single().text.contains("+03:00"))
    assertTrue(rows.single().text.contains("+02:00"))
  }
  @Test fun `spring missing start does not invent a new outage after the clock jump`() {
    val today = day("2026-03-29", Slot(0, 210, "on"), Slot(210, 300, "off"), Slot(300, 1440, "on"))
    val days = mapOf(today.date to today)
    assertEquals("unknown", WidgetModel.state(days, "1.1", time("2026-03-29 04:30")))
    assertTrue(WidgetModel.rows(today, "1.1", time("2026-03-29 12:00")).isEmpty())
  }
}
