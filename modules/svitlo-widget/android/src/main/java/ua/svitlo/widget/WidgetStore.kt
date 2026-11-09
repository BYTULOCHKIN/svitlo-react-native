package ua.svitlo.widget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class WidgetStore(private val context: Context) {
  private val prefs = context.getSharedPreferences("svitlo.widget.v1", Context.MODE_PRIVATE)
  fun locations(): List<WidgetLocation> = runCatching {
    val array = JSONArray(prefs.getString("locations", "[]"))
    (0 until array.length()).map { array.getJSONObject(it) }.map { WidgetLocation(it.getString("id"), it.getString("name"), it.getString("queue")) }
  }.getOrDefault(emptyList())
  fun sync(locations: String, endpoint: String, scheme: String) {
    val rows = JSONArray(locations)
    require(rows.length() <= 50)
    for (i in 0 until rows.length()) {
      val row = rows.getJSONObject(i)
      require(row.getString("id").isNotBlank() && row.getString("name").length in 1..20 && Regex("\\d+\\.\\d+").matches(row.getString("queue")))
    }
    require(endpoint.startsWith("https://") && Regex("[a-z][a-z0-9-]+").matches(scheme))
    check(prefs.edit().putString("locations", rows.toString()).putString("endpoint", endpoint.trimEnd('/')).putString("scheme", scheme).commit())
  }
  fun binding(id: Int): String? = prefs.getString("widget.$id", null)
  fun bind(id: Int, location: String) { require(locations().any { it.id == location }); check(prefs.edit().putString("widget.$id", location).commit()) }
  fun remove(id: Int) { prefs.edit().remove("widget.$id").apply() }
  fun endpoint(): String = prefs.getString("endpoint", "https://svitlo-backend-pilot.onrender.com")!!
  fun scheme(): String = prefs.getString("scheme", when { context.packageName.endsWith(".development") -> "svitlo-rn-development"; context.packageName.endsWith(".preview") -> "svitlo-rn-preview"; else -> "svitlo-rn" })!!
  fun error(date: String): String? = prefs.getString("error.$date", null)
  fun error(date: String, message: String?) { prefs.edit().putString("error.$date", message).apply() }
  fun raw(date: String): String? = prefs.getString("day.$date", null)
  fun day(date: String, now: Long): WidgetDay? = runCatching { prefs.getString("day.$date", null)?.let { WidgetContract.parse(it, date, now) } }.getOrNull()
  fun save(date: String, raw: String, now: Long) {
    val incoming = WidgetContract.parse(raw, date, now)
    val current = day(date, now)
    if (current != null && current.verifiedAt > incoming.verifiedAt) return
    val retained = (-1..1).map { WidgetModel.dateOffset(now, it) }.toSet()
    val edit = prefs.edit().putString("day.$date", raw)
    prefs.all.keys.filter { it.startsWith("day.") || it.startsWith("error.") }.forEach { key ->
      if (key.substringAfter('.') !in retained) edit.remove(key)
    }
    check(edit.commit())
  }
}
