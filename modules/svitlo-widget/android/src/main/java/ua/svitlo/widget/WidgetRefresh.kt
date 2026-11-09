package ua.svitlo.widget

import android.content.Context
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

/** A single bounded request stream serves all widget instances; failed data never replaces cache. */
object WidgetRefresh {
  private val running = AtomicBoolean(false)
  fun active() = running.get()
  fun execute(context: Context): Boolean {
    if (!running.compareAndSet(false, true)) return true
    return try {
      SvitloWidgetProvider.renderAll(context)
      perform(context)
    } finally { running.set(false) }
  }
  private fun perform(context: Context): Boolean {
    val store = WidgetStore(context)
    if (SvitloWidgetProvider.ids(context).isEmpty()) return true
    val now = System.currentTimeMillis()
    val dates = mutableListOf(WidgetTime.date(now), WidgetModel.dateOffset(now, 1))
    val yesterday = WidgetModel.dateOffset(now, -1)
    if (WidgetTime.minute(now) < 120 && store.day(yesterday, now) == null) dates += yesterday
    var success = true
    for (date in dates) {
      if (SvitloWidgetProvider.ids(context).isEmpty()) break
      if (!updateDate(store, date, System.currentTimeMillis()) { fetch(store.endpoint(), date) }) success = false
    }
    return success
  }
  data class Response(val code: Int, val body: String = "")
  fun updateDate(store: WidgetStore, date: String, now: Long, fetch: () -> Response): Boolean {
    return runCatching {
      val response = fetch()
      when (response.code) {
        200 -> { store.save(date, response.body, now); store.error(date, null) }
        404 -> store.error(date, "Графік поки недоступний")
        else -> throw IllegalStateException("API unavailable")
      }
      true
    }.getOrElse { store.error(date, "Не вдалося оновити. Показано збережені дані, якщо вони є."); false }
  }
  private fun fetch(endpoint: String, date: String): Response {
    val connection = URL("$endpoint/v1/schedules?date=$date").openConnection() as HttpURLConnection
    try {
      connection.connectTimeout = 15000; connection.readTimeout = 15000
      connection.instanceFollowRedirects = false
      val code = connection.responseCode
      if (code != 200) return Response(code)
      val body = connection.inputStream.bufferedReader().use { reader ->
        val buffer = CharArray(4096)
        val result = StringBuilder()
        while (true) {
          val count = reader.read(buffer)
          if (count < 0) break
          require(result.length + count <= 256 * 1024)
          result.append(buffer, 0, count)
        }
        result.toString()
      }
      return Response(code, body)
    } finally { connection.disconnect() }
  }
}
