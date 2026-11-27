package expo.modules.volumebutton

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VolumeButtonModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var enabled = false
  private var receiver: BroadcastReceiver? = null
  private var lastVolume: Int? = null
  private var suppressNext = false

  override fun definition() = ModuleDefinition {
    Name("VolumeButton")
    Events("onVolumeButton")

    Function("setEnabled") { value: Boolean ->
      enabled = value
      if (value) {
        register()
      } else {
        unregister()
      }
    }

    OnDestroy {
      unregister()
    }
  }

  private fun context(): Context? = appContext.reactContext

  private fun audioManager(): AudioManager? {
    return context()?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
  }

  private fun register() {
    if (receiver != null) return
    val ctx = context() ?: return
    val am = audioManager() ?: return
    val stream = AudioManager.STREAM_MUSIC
    lastVolume = am.getStreamVolume(stream)
    receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action != "android.media.VOLUME_CHANGED_ACTION") return
        val amgr = audioManager() ?: return
        val changedStream = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_TYPE", stream)
        val current = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_VALUE", amgr.getStreamVolume(changedStream))
        val prev = lastVolume ?: current
        if (suppressNext) {
          suppressNext = false
          lastVolume = current
          return
        }
        if (current == prev) return
        val type = if (current > prev) "up" else "down"
        if (enabled) {
          suppressNext = true
          amgr.setStreamVolume(changedStream, prev, 0)
          lastVolume = prev
          sendEvent("onVolumeButton", mapOf("type" to type))
        } else {
          lastVolume = current
        }
      }
    }
    ctx.registerReceiver(receiver, IntentFilter("android.media.VOLUME_CHANGED_ACTION"))
  }

  private fun unregister() {
    val ctx = context()
    receiver?.let {
      try { ctx?.unregisterReceiver(it) } catch (_: Exception) {}
    }
    receiver = null
    lastVolume = null
    suppressNext = false
  }
}
