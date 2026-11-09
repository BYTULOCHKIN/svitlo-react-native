package ua.svitlo.widget

import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class WidgetLayoutTest {
  @Test fun `narrow columns retain current outage and expose overflow without clipping rows`() {
    val context = RuntimeEnvironment.getApplication()
    val rows = listOf(
      OutageRow(0, 1, "off", "00:00–01:00\n1 год", false, true),
      OutageRow(2, 3, "possible", "Можливе · 10:00–11:00\n1 год", true, false),
      OutageRow(4, 5, "off", "12:00–13:00\n1 год", false, false)
    )
    val enough = WidgetLayout.fit(context, rows, 110f, 500)
    assertEquals(3, enough.rows.size); assertEquals(0, enough.hidden)
    val currentCost = WidgetLayout.height(context, "Зараз · " + rows[1].text, 12f, 110f) + 8
    val limited = WidgetLayout.fit(context, rows, 110f, currentCost + 36)
    assertEquals(listOf(rows[1]), limited.rows); assertEquals(2, limited.hidden)
    assertEquals(3, WidgetLayout.fit(context, rows, 110f, 0).hidden)
  }
}
