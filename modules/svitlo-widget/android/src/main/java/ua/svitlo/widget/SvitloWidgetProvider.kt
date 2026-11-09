package ua.svitlo.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

class SvitloWidgetProvider : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == REFRESH) refresh(context)
    if (intent.action == WidgetWork.TICK) { renderAll(context); WidgetWork.scheduleTick(context) }
  }
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { render(context, it) }; WidgetWork.reconcile(context); refresh(context)
  }
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) { render(context, id) }
  override fun onDeleted(context: Context, ids: IntArray) { ids.forEach { WidgetStore(context).remove(it) }; WidgetWork.reconcile(context) }
  override fun onDisabled(context: Context) { WidgetWork.reconcile(context) }
  companion object {
    const val REFRESH = "ua.svitlo.widget.REFRESH"
    fun ids(context: Context): IntArray = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, SvitloWidgetProvider::class.java))
    fun appIntent(context: Context, location: String?, date: String? = null): Intent = Intent(Intent.ACTION_VIEW, Uri.Builder().scheme(WidgetStore(context).scheme()).authority("widget").apply {
      location?.let { appendQueryParameter("locationId", it) }; date?.let { appendQueryParameter("date", it) }
    }.build()).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    fun renderAll(context: Context) { ids(context).forEach { render(context, it) } }
    private fun launch(context: Context, id: Int, intent: Intent): PendingIntent = PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun render(context: Context, id: Int) {
      val store = WidgetStore(context)
      val location = store.locations().find { it.id == store.binding(id) }
      val now = System.currentTimeMillis()
      val date = WidgetTime.date(now)
      val days = (-1..1).map { WidgetModel.dateOffset(now, it) }.mapNotNull { key -> store.day(key, now)?.let { key to it } }.toMap()
      val today = days[date]
      val state = WidgetModel.state(days, location?.queue.orEmpty(), now)
      val view = RemoteViews(context.packageName, R.layout.svitlo_widget)
      view.setTextViewText(R.id.widget_location, location?.let { "${it.name}\n#${it.queue}" } ?: "ЄСвітло")
      view.setTextViewText(R.id.widget_status, if (location == null) "Локацію видалено — оберіть іншу" else when(state) {
        "on" -> "Увімкнено за графіком"; "off" -> "Вимкнено за графіком"; "possible" -> "Можливе відключення за графіком"; else -> "Немає даних"
      })
      view.setTextColor(R.id.widget_status, Color.parseColor(when(state) { "on" -> "#2ECC71"; "off" -> "#FF8178"; "possible" -> "#FFC166"; else -> "#B8B8B8" }))
      view.setTextViewText(R.id.widget_updated, today?.let { "Перевірено ${WidgetTime.format("dd.MM HH:mm", it.verifiedAt)} · Київ" } ?: "Графік поки недоступний")
      val message = listOfNotNull(
        if (today != null && now - today.verifiedAt >= 30 * 60000) "Дані можуть бути застарілими · розрахунок за збереженим графіком" else null,
        store.error(date)
      ).joinToString("\n")
      view.setTextViewText(R.id.widget_message, message)
      view.setViewVisibility(R.id.widget_message, if (message.isEmpty() || location == null) View.GONE else View.VISIBLE)
      val countdown = location?.let { WidgetModel.countdown(days, it.queue, now) }
      view.setTextViewText(R.id.widget_countdown, countdown?.let { "${it.label} ≈${WidgetModel.duration(it.minutes)}" } ?: "Наступна подія невідома")
      val configure = Intent(context, WidgetConfigureActivity::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).setData(Uri.parse("svitlo-widget://configure/$id"))
      val configPending = launch(context, id, configure)
      view.setOnClickPendingIntent(R.id.widget_configure, configPending)
      view.setOnClickPendingIntent(R.id.widget_root, if (location == null) configPending else launch(context, id, appIntent(context, location.id)))
      view.setTextViewText(R.id.widget_refresh, if (WidgetRefresh.active()) "Оновлення…" else "↻ Оновити")
      view.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, 0, Intent(context, SvitloWidgetProvider::class.java).setAction(REFRESH), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(id)
      val portrait = context.resources.configuration.orientation != Configuration.ORIENTATION_LANDSCAPE
      val width = options.getInt(if (portrait) AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH else AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 300).coerceAtLeast(250)
      val height = options.getInt(if (portrait) AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT else AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 400).coerceAtLeast(250)
      if (location != null) {
        view.setImageViewBitmap(R.id.widget_timeline, WidgetTimeline.draw(days, location.queue, now, ((width - 24) * 168f / 64f).toInt()))
        view.setContentDescription(R.id.widget_timeline, WidgetTimeline.description(days, location.queue, now))
        val contentWidth = (width - 24).toFloat()
        val headerHeight = maxOf(
          WidgetLayout.height(context, "${location.name}\n#${location.queue}", 18f, contentWidth / 2.3f - 8),
          WidgetLayout.height(context, when(state) { "on" -> "Увімкнено за графіком"; "off" -> "Вимкнено за графіком"; "possible" -> "Можливе відключення за графіком"; else -> "Немає даних" }, 16f, contentWidth * 1.3f / 2.3f)
        )
        val updatedHeight = WidgetLayout.height(context, today?.let { "Перевірено ${WidgetTime.format("dd.MM HH:mm", it.verifiedAt)} · Київ" } ?: "Графік поки недоступний", 10f, contentWidth)
        val countdownHeight = WidgetLayout.height(context, countdown?.let { "${it.label} ≈${WidgetModel.duration(it.minutes)}" } ?: "Наступна подія невідома", 13f, contentWidth)
        val messageHeight = WidgetLayout.height(context, message, 11f, contentWidth)
        val rowsHeight = height - 24 - headerHeight - 4 - updatedHeight - 4 - countdownHeight - messageHeight - 6 - 64 - 40 - WidgetLayout.height(context, "Сьогодні", 15f, (contentWidth - 12) / 2)
        column(context, id, view, R.id.widget_today_rows, R.id.widget_today_more, location, date, today, now, rowsHeight, (contentWidth - 12) / 2)
        val tomorrow = WidgetModel.dateOffset(now, 1)
        column(context, id, view, R.id.widget_tomorrow_rows, R.id.widget_tomorrow_more, location, tomorrow, days[tomorrow], now, rowsHeight, (contentWidth - 12) / 2)
      }
      listOf(R.id.widget_timeline, R.id.widget_columns, R.id.widget_countdown, R.id.widget_updated, R.id.widget_refresh).forEach {
        view.setViewVisibility(it, if (location == null) View.GONE else View.VISIBLE)
      }
      AppWidgetManager.getInstance(context).updateAppWidget(id, view)
    }
    private fun column(context: Context, id: Int, view: RemoteViews, rowsId: Int, moreId: Int, location: WidgetLocation, date: String, day: WidgetDay?, now: Long, availableHeight: Int, width: Float) {
      view.removeAllViews(rowsId)
      val rows = WidgetModel.rows(day, location.queue, now)
      val visible = WidgetLayout.fit(context, rows, width, availableHeight)
      if (rows.isEmpty()) {
        val text = when {
          day == null -> WidgetStore(context).error(date) ?: "Графік поки недоступний"
          day.slots(location.queue).isEmpty() -> "Немає даних для черги"
          else -> "Відключень не заплановано"
        }
        val row = RemoteViews(context.packageName, R.layout.svitlo_widget_row)
        row.setTextViewText(R.id.widget_row, text); view.addView(rowsId, row)
      }
      visible.rows.forEach {
        val row = RemoteViews(context.packageName, R.layout.svitlo_widget_row)
        row.setTextViewText(R.id.widget_row, (if (it.current) "Зараз · " else "") + it.text)
        row.setTextColor(R.id.widget_row, Color.parseColor(when { it.current -> "#FF8178"; it.past -> "#999999"; it.state == "possible" -> "#FFC166"; else -> "#F5F5F5" }))
        view.addView(rowsId, row)
      }
      view.setTextViewText(moreId, "Ще ${visible.hidden}")
      view.setViewVisibility(moreId, if (visible.hidden > 0) View.VISIBLE else View.GONE)
      view.setOnClickPendingIntent(moreId, launch(context, id, appIntent(context, location.id, date)))
    }
    fun refresh(context: Context) { WidgetWork.refresh(context) }
  }
}
