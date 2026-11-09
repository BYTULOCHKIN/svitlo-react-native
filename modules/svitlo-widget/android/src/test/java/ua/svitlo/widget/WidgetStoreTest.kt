package ua.svitlo.widget

import android.content.Context
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class WidgetStoreTest {
  private val endpoint = "https://svitlo-backend-pilot.onrender.com"
  private val locations = """[{"id":"home","name":"Дім","queue":"1.1"},{"id":"work","name":"Робота","queue":"2.1"}]"""
  private lateinit var context: Context
  @Before fun setup() { context = RuntimeEnvironment.getApplication(); context.getSharedPreferences("svitlo.widget.v1", 0).edit().clear().commit() }
  @Test fun `bindings persist independently and changing selection cannot replace another widget`() {
    val store = WidgetStore(context)
    store.sync(locations, endpoint, "svitlo-rn")
    store.bind(10, "home"); store.bind(20, "work")
    store.bind(10, "work")
    assertEquals("work", WidgetStore(context).binding(10))
    assertEquals("work", WidgetStore(context).binding(20))
    store.remove(10)
    assertNull(store.binding(10)); assertEquals("work", store.binding(20))
  }
  @Test fun `deleting location retains missing binding rather than selecting another address`() {
    val store = WidgetStore(context)
    store.sync(locations, endpoint, "svitlo-rn"); store.bind(10, "home")
    store.sync("""[{"id":"work","name":"Робота","queue":"2.1"}]""", endpoint, "svitlo-rn")
    assertEquals("home", WidgetStore(context).binding(10))
    assertNull(store.locations().find { it.id == store.binding(10) })
    assertTrue(runCatching { store.bind(10, "missing") }.isFailure)
    assertEquals("home", store.binding(10))
  }
  @Test fun `invalid response preserves valid cached day and wrong date remains absent`() {
    val now = 1794236400000L
    val store = WidgetStore(context)
    val raw = """{"date":"2026-11-09","verifiedAt":$now,"stale":false,"noOutagesScope":"region","queues":[]}"""
    store.save("2026-11-09", raw, now)
    assertTrue(runCatching { store.save("2026-11-09", "{}", now) }.isFailure)
    assertEquals(now, WidgetStore(context).day("2026-11-09", now)?.verifiedAt)
    assertNull(store.day("2026-11-10", now))
  }
}
