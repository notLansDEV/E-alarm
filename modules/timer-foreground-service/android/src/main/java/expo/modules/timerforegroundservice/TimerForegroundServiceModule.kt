package expo.modules.timerforegroundservice

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TimerForegroundServiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TimerForegroundService")

    Function("start") { endAtMillis: Double ->
      val context = appContext.reactContext ?: return@Function
      TimerForegroundService.start(context, endAtMillis.toLong())
    }

    Function("stop") {
      val context = appContext.reactContext ?: return@Function
      TimerForegroundService.stop(context)
    }
  }
}
