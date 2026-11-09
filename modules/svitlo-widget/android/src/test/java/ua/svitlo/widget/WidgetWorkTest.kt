package ua.svitlo.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.SynchronousExecutor
import androidx.work.testing.WorkManagerTestInitHelper
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class WidgetWorkTest {
  private val context get() = RuntimeEnvironment.getApplication()
  @Before fun setup() {
    context.getSharedPreferences("svitlo.widget.v1", 0).edit().clear().commit()
    WidgetStore(context).sync("[]", "https://127.0.0.1:1", "svitlo-rn")
    WorkManagerTestInitHelper.initializeTestWorkManager(context, androidx.work.Configuration.Builder().setExecutor(SynchronousExecutor()).build())
  }
  @Test fun `one background schedule serves multiple widgets and is cancelled after last deletion`() {
    val manager = AppWidgetManager.getInstance(context)
    val widgets = shadowOf(manager)
    widgets.createWidget(SvitloWidgetProvider::class.java, R.layout.svitlo_widget)
    widgets.createWidget(SvitloWidgetProvider::class.java, R.layout.svitlo_widget)
    WidgetWork.reconcile(context)
    val work = WorkManager.getInstance(context)
    val periodic = work.getWorkInfosForUniqueWork(WidgetWork.PERIODIC).get()
    assertEquals(1, periodic.size)
    assertEquals(WorkInfo.State.ENQUEUED, periodic.single().state)
    // Simulate the host removing all widget bindings before the provider receives deletion.
    widgets.addBoundWidget(1, android.appwidget.AppWidgetProviderInfo().apply { provider = ComponentName(context, "other.Widget") })
    widgets.addBoundWidget(2, android.appwidget.AppWidgetProviderInfo().apply { provider = ComponentName(context, "other.Widget") })
    WidgetWork.reconcile(context)
    assertEquals(WorkInfo.State.CANCELLED, work.getWorkInfosForUniqueWork(WidgetWork.PERIODIC).get().single().state)
  }
}
