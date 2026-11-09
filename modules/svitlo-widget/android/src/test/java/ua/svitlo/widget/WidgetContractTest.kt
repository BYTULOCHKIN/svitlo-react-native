package ua.svitlo.widget

import org.junit.Assert.*
import org.junit.Test
import org.json.JSONObject
import java.util.TimeZone

class WidgetContractTest {
  private val now = 1794236400000L
  private fun payload() = """{"date":"2026-11-09","verifiedAt":$now,"stale":false,"queues":[{"queue":"1.1","intervals":[{"start":0,"end":600,"state":"on"},{"start":600,"end":900,"state":"off"},{"start":900,"end":1440,"state":"possible"}]}]}"""
  @Test fun `valid schedule retains three distinct states`() {
    val day = WidgetContract.parse(payload(), "2026-11-09", now)
    assertEquals(listOf("on", "off", "possible"), day.slots("1.1").map { it.state })
    assertTrue(day.slots("2.1").isEmpty())
  }
  @Test fun `reject wrong date gap fractional incomplete and future verified timestamp`() {
    val invalid = listOf(
      payload().replace("2026-11-09", "2026-11-10"),
      payload().replace("\"start\":600", "\"start\":601"),
      payload().replace("\"end\":600", "\"end\":600.5"),
      payload().replace("\"end\":1440", "\"end\":1439"),
      payload().replace(now.toString(), (now + 60000).toString()),
      payload().replace("\"off\"", "\"unknown\""),
      payload().replace("\"start\":600", "\"start\":\"600\""),
      payload().replace("\"queue\":\"1.1\"", "\"queue\":1.1"),
      payload().replace(now.toString(), "$now.5")
    )
    invalid.forEach { assertTrue(runCatching { WidgetContract.parse(it, "2026-11-09", now) }.isFailure) }
  }
  @Test fun `empty queues only valid with explicit regional no outages`() {
    val json = JSONObject(payload()).put("queues", org.json.JSONArray())
    assertTrue(runCatching { WidgetContract.parse(json.toString(), "2026-11-09", now) }.isFailure)
    json.put("noOutagesScope", "region")
    assertEquals(listOf(Slot(0, 1440, "on")), WidgetContract.parse(json.toString(), "2026-11-09", now).slots("9.9"))
  }
  @Test fun `Kyiv date and minute ignore device time zone`() {
    val before = TimeZone.getDefault()
    try {
      TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
      assertEquals("2026-11-09", WidgetTime.date(now))
      assertEquals(17 * 60, WidgetTime.minute(now))
    } finally { TimeZone.setDefault(before) }
  }
}
