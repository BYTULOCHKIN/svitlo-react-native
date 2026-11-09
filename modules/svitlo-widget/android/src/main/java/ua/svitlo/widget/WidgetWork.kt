package ua.svitlo.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.*
import java.util.concurrent.TimeUnit

class WidgetWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    val success = WidgetRefresh.execute(applicationContext)
    SvitloWidgetProvider.renderAll(applicationContext)
    return if (success || runAttemptCount >= 2) Result.success() else Result.retry()
  }
}

/** One network schedule for all widgets; local non-waking ticks never download data. */
object WidgetWork {
  const val PERIODIC = "svitlo-widget-periodic-v1"
  const val MANUAL = "svitlo-widget-refresh-v1"
  const val TICK = "ua.svitlo.widget.TICK"
  private fun constraints() = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
  fun reconcile(context: Context) {
    val work = WorkManager.getInstance(context)
    if (SvitloWidgetProvider.ids(context).isEmpty()) {
      work.cancelUniqueWork(PERIODIC); work.cancelUniqueWork(MANUAL)
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(tickIntent(context))
      return
    }
    val request = PeriodicWorkRequestBuilder<WidgetWorker>(15, TimeUnit.MINUTES).setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
    work.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
    scheduleTick(context)
  }
  fun refresh(context: Context) {
    if (SvitloWidgetProvider.ids(context).isEmpty()) return
    // No network constraint here: a manual offline attempt should complete with an error, not spin forever.
    val request = OneTimeWorkRequestBuilder<WidgetWorker>().setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
    WorkManager.getInstance(context).enqueueUniqueWork(MANUAL, ExistingWorkPolicy.KEEP, request)
  }
  private fun tickIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(context, 1, Intent(context, SvitloWidgetProvider::class.java).setAction(TICK), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  fun scheduleTick(context: Context) {
    if (SvitloWidgetProvider.ids(context).isEmpty()) return
    // RTC does not wake a sleeping phone; Android may batch this inexact alarm. No exact-alarm permission.
    (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).set(AlarmManager.RTC, (System.currentTimeMillis() / 60000 + 1) * 60000, tickIntent(context))
  }
}

class WidgetSystemReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    SvitloWidgetProvider.renderAll(context)
    WidgetWork.reconcile(context)
    if (intent.action in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED)) WidgetWork.refresh(context)
  }
}
