package ua.svitlo.widget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SvitloWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SvitloWidget")
    Function("readDay") { date: String ->
      require(Regex("\\d{4}-\\d{2}-\\d{2}").matches(date))
      WidgetStore(requireNotNull(appContext.reactContext)).raw(date)
    }
    Function("sync") { locations: String, endpoint: String, scheme: String ->
      val context = requireNotNull(appContext.reactContext)
      WidgetStore(context).sync(locations, endpoint, scheme)
      SvitloWidgetProvider.renderAll(context)
      WidgetWork.reconcile(context)
    }
  }
}
