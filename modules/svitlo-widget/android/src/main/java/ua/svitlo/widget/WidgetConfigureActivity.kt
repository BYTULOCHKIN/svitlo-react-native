package ua.svitlo.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class WidgetConfigureActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)
    val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    val manager = AppWidgetManager.getInstance(this)
    if (id == AppWidgetManager.INVALID_APPWIDGET_ID || manager.getAppWidgetInfo(id)?.provider?.packageName != packageName) { finish(); return }
    showChoices(id)
  }
  override fun onResume() {
    super.onResume()
    val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    if (id != AppWidgetManager.INVALID_APPWIDGET_ID) showChoices(id)
  }
  private fun showChoices(id: Int) {
    val content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 48, 32, 32) }
    content.addView(TextView(this).apply { text = "Локація віджета"; textSize = 24f; setTextColor(Color.WHITE) })
    val store = WidgetStore(this)
    val locations = store.locations()
    if (locations.isEmpty()) {
      content.addView(TextView(this).apply { text = "Спочатку додайте локацію в застосунку"; textSize = 16f; setPadding(0, 32, 0, 16) })
      content.addView(Button(this).apply { text = "Відкрити ЄСвітло"; setOnClickListener { startActivity(SvitloWidgetProvider.appIntent(this@WidgetConfigureActivity, null)); finish() } })
    }
    locations.forEach { location ->
      content.addView(Button(this).apply {
        text = "${location.name} · ${location.queue}"; isAllCaps = false
        setOnClickListener {
          store.bind(id, location.id)
          SvitloWidgetProvider.render(this@WidgetConfigureActivity, id)
          WidgetWork.reconcile(this@WidgetConfigureActivity)
          SvitloWidgetProvider.refresh(this@WidgetConfigureActivity)
          setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)); finish()
        }
      })
    }
    content.addView(Button(this).apply { text = "Скасувати"; setOnClickListener { finish() } })
    setContentView(ScrollView(this).apply { addView(content) })
  }
}
