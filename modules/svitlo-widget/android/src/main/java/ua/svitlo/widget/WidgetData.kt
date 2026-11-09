package ua.svitlo.widget

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

data class WidgetLocation(val id: String, val name: String, val queue: String)
data class Slot(val start: Int, val end: Int, val state: String)
data class WidgetDay(val date: String, val queues: Map<String, List<Slot>>, val noOutages: Boolean, val verifiedAt: Long) {
  fun slots(queue: String): List<Slot> = if (noOutages) listOf(Slot(0, 1440, "on")) else queues[queue].orEmpty()
}

/** All wall-clock interpretation is Kyiv-based, never the device's default zone. */
object WidgetTime {
  val zone: TimeZone get() = TimeZone.getTimeZone("Europe/Kyiv").let { if (it.id == "GMT") TimeZone.getTimeZone("Europe/Kiev") else it }
  fun format(pattern: String, time: Long): String = SimpleDateFormat(pattern, Locale("uk", "UA")).apply { timeZone = zone }.format(time)
  fun date(now: Long) = format("yyyy-MM-dd", now)
  fun minute(now: Long): Int = Calendar.getInstance(zone).apply { timeInMillis = now }.let { it.get(Calendar.HOUR_OF_DAY) * 60 + it.get(Calendar.MINUTE) }
}

/** Reject incomplete, wrong-date and malformed responses before they can replace valid data. */
object WidgetContract {
  fun parse(raw: String, date: String, now: Long): WidgetDay {
    val json = JSONObject(raw)
    require(json.getString("date") == date && Regex("\\d{4}-\\d{2}-\\d{2}").matches(date))
    val verifiedValue = json.get("verifiedAt")
    require(verifiedValue is Number && verifiedValue.toDouble() % 1.0 == 0.0)
    val verified = verifiedValue.toLong()
    require(verified > 0 && verified <= now + 30000)
    require(json.get("stale") is Boolean)
    val noOutages = json.optString("noOutagesScope") == "region"
    require(!json.has("noOutagesScope") || noOutages)
    val rows = json.getJSONArray("queues")
    require(rows.length() in 0..100 && (rows.length() > 0 || noOutages))
    val queues = linkedMapOf<String, List<Slot>>()
    for (i in 0 until rows.length()) {
      val row = rows.getJSONObject(i)
      require(row.get("queue") is String)
      val queue = row.getString("queue")
      require(Regex("\\d+\\.\\d+").matches(queue) && !queues.containsKey(queue))
      val intervals = row.getJSONArray("intervals")
      require(intervals.length() in 1..48)
      var end = 0
      val slots = mutableListOf<Slot>()
      for (j in 0 until intervals.length()) {
        val interval = intervals.getJSONObject(j)
        require(interval.get("start") is Number && interval.get("end") is Number)
        val startNumber = interval.getDouble("start")
        val endNumber = interval.getDouble("end")
        require(startNumber == end.toDouble() && endNumber % 1.0 == 0.0 && endNumber > end && endNumber <= 1440)
        val state = interval.getString("state")
        require(state in listOf("on", "off", "possible"))
        slots += Slot(end, endNumber.toInt(), state)
        end = endNumber.toInt()
      }
      require(end == 1440)
      queues[queue] = slots
    }
    return WidgetDay(date, queues, noOutages, verified)
  }
}
