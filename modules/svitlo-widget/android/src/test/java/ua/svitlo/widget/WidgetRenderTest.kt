package ua.svitlo.widget

import android.appwidget.AppWidgetManager
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "xhdpi")
@org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
class WidgetRenderTest {
  private val context get() = RuntimeEnvironment.getApplication()
  @Before fun setup() {
    context.getSharedPreferences("svitlo.widget.v1", 0).edit().clear().commit()
    androidx.work.testing.WorkManagerTestInitHelper.initializeTestWorkManager(context, androidx.work.Configuration.Builder().setExecutor(androidx.work.testing.SynchronousExecutor()).build())
  }
  @Test fun `real RemoteViews shows schedule state for each independent bound location`() {
    WidgetStore(context).sync("[]", "https://127.0.0.1:1", "svitlo-rn")
    val manager = AppWidgetManager.getInstance(context)
    val shadow = shadowOf(manager)
    val first = shadow.createWidget(SvitloWidgetProvider::class.java, R.layout.svitlo_widget)
    val second = shadow.createWidget(SvitloWidgetProvider::class.java, R.layout.svitlo_widget)
    val store = WidgetStore(context)
    store.sync("""[{"id":"home","name":"Дім","queue":"1.1"},{"id":"work","name":"Робота","queue":"2.1"}]""", "https://example.invalid", "svitlo-rn")
    store.bind(first, "home"); store.bind(second, "work")
    val now = System.currentTimeMillis()
    val date = WidgetTime.date(now)
    store.save(date, """{"date":"$date","verifiedAt":$now,"stale":false,"queues":[{"queue":"1.1","intervals":[{"start":0,"end":1440,"state":"off"}]},{"queue":"2.1","intervals":[{"start":0,"end":1440,"state":"possible"}]}]}""", now)
    SvitloWidgetProvider.renderAll(context)
    assertEquals("Дім\n#1.1", shadow.getViewFor(first).findViewById<TextView>(R.id.widget_location).text.toString())
    assertEquals("Вимкнено за графіком", shadow.getViewFor(first).findViewById<TextView>(R.id.widget_status).text.toString())
    assertEquals("Можливе відключення за графіком", shadow.getViewFor(second).findViewById<TextView>(R.id.widget_status).text.toString())
    store.sync("[]", "https://example.invalid", "svitlo-rn")
    SvitloWidgetProvider.renderAll(context)
    assertEquals("Локацію видалено — оберіть іншу", shadow.getViewFor(first).findViewById<TextView>(R.id.widget_status).text.toString())
  }

  @Test fun `full widget fits a resized home screen area and exports native preview`() {
    val store = WidgetStore(context)
    store.sync("""[{"id":"preview","name":"Тестова локація","queue":"1.1"}]""", "https://127.0.0.1:1", "svitlo-rn")
    val manager = AppWidgetManager.getInstance(context)
    val shadow = shadowOf(manager)
    val id = shadow.createWidget(SvitloWidgetProvider::class.java, R.layout.svitlo_widget)
    store.bind(id, "preview")
    val now = System.currentTimeMillis()
    val date = WidgetTime.date(now)
    val tomorrow = WidgetModel.dateOffset(now, 1)
    store.save(date, """{"date":"$date","verifiedAt":$now,"stale":false,"queues":[{"queue":"1.1","intervals":[{"start":0,"end":180,"state":"on"},{"start":180,"end":300,"state":"off"},{"start":300,"end":600,"state":"on"},{"start":600,"end":780,"state":"off"},{"start":780,"end":900,"state":"on"},{"start":900,"end":1140,"state":"off"},{"start":1140,"end":1260,"state":"possible"},{"start":1260,"end":1440,"state":"on"}]}]}""", now)
    store.save(tomorrow, """{"date":"$tomorrow","verifiedAt":$now,"stale":false,"queues":[{"queue":"1.1","intervals":[{"start":0,"end":540,"state":"on"},{"start":540,"end":660,"state":"off"},{"start":660,"end":1440,"state":"on"}]}]}""", now)
    val options = android.os.Bundle().apply {
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 300); putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 300)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 400); putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 400)
    }
    manager.updateAppWidgetOptions(id, options)
    SvitloWidgetProvider.render(context, id)
    val root = shadow.getViewFor(id)
    val density = context.resources.displayMetrics.density
    val width = (300 * density).toInt(); val height = (400 * density).toInt()
    root.measure(android.view.View.MeasureSpec.makeMeasureSpec(width, android.view.View.MeasureSpec.EXACTLY), android.view.View.MeasureSpec.makeMeasureSpec(height, android.view.View.MeasureSpec.EXACTLY))
    root.layout(0, 0, width, height)
    val columns = root.findViewById<android.view.View>(R.id.widget_columns)
    val rows = root.findViewById<android.widget.LinearLayout>(R.id.widget_today_rows)
    assertTrue("rows fit their column", rows.bottom <= (rows.parent as android.view.View).height)
    assertTrue("columns stay above actions", columns.bottom <= root.findViewById<android.view.View>(R.id.widget_refresh).let { (it.parent as android.view.View).top })
    val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
    root.draw(android.graphics.Canvas(bitmap))
    val output = java.io.File("../../../.tmp/widget-native-preview.png")
    output.parentFile?.mkdirs()
    output.outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
    options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250); options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 250)
    options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 320); options.putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 320)
    manager.updateAppWidgetOptions(id, options); SvitloWidgetProvider.render(context, id)
    val narrow = shadow.getViewFor(id)
    narrow.measure(android.view.View.MeasureSpec.makeMeasureSpec((250 * density).toInt(), android.view.View.MeasureSpec.EXACTLY), android.view.View.MeasureSpec.makeMeasureSpec((320 * density).toInt(), android.view.View.MeasureSpec.EXACTLY))
    narrow.layout(0, 0, (250 * density).toInt(), (320 * density).toInt())
    val more = narrow.findViewById<android.view.View>(R.id.widget_today_more)
    assertEquals(android.view.View.VISIBLE, more.visibility)
    assertTrue("overflow action fits minimum size: ${more.bottom} <= ${(more.parent as android.view.View).height}", more.bottom <= (more.parent as android.view.View).height)
  }
}
