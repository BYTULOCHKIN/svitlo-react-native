package ua.svitlo.widget

import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class WidgetRefreshTest {
  private val now = 1794236400000L
  private val date = "2026-11-09"
  private val raw get() = """{"date":"$date","verifiedAt":$now,"stale":false,"noOutagesScope":"region","queues":[]}"""
  private lateinit var store: WidgetStore
  @Before fun setup() {
    val context = RuntimeEnvironment.getApplication()
    context.getSharedPreferences("svitlo.widget.v1", 0).edit().clear().commit()
    store = WidgetStore(context)
  }
  @Test fun `success passes validated API data through persistent cache and clears prior error`() {
    store.error(date, "old")
    assertTrue(WidgetRefresh.updateDate(store, date, now) { WidgetRefresh.Response(200, raw) })
    assertEquals("on", store.day(date, now)?.slots("1.1")?.first()?.state)
    assertNull(store.error(date))
  }
  @Test fun `network API and invalid payload failures preserve source verification time`() {
    store.save(date, raw, now)
    listOf(WidgetRefresh.Response(500), WidgetRefresh.Response(200, "{}"), WidgetRefresh.Response(200, raw.replace(date, "2026-11-10"))).forEach { response ->
      assertFalse(WidgetRefresh.updateDate(store, date, now + 1800000) { response })
      assertEquals(now, store.day(date, now + 1800000)?.verifiedAt)
      assertNotNull(store.error(date))
    }
    assertFalse(WidgetRefresh.updateDate(store, date, now) { throw java.io.IOException() })
    assertEquals(now, store.day(date, now)?.verifiedAt)
  }
  @Test fun `unavailable tomorrow never substitutes today's cache or claims no outages`() {
    store.save(date, raw, now)
    assertTrue(WidgetRefresh.updateDate(store, "2026-11-10", now) { WidgetRefresh.Response(404) })
    assertNull(store.day("2026-11-10", now))
    assertEquals("Графік поки недоступний", store.error("2026-11-10"))
    assertNotNull(store.day(date, now))
  }
}
