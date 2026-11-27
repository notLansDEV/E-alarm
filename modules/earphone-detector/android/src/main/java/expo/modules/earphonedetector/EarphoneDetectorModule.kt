package expo.modules.earphonedetector

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EarphoneDetectorModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var audioManager: AudioManager? = null
  private var deviceCallback: AudioDeviceCallback? = null
  private var headsetReceiver: BroadcastReceiver? = null
  private var observing = false

  override fun definition() = ModuleDefinition {
    Name("EarphoneDetector")
    Events("onChange")

    Function("getStatus") {
      return@Function currentStatus()
    }

    OnStartObserving {
      startObserving()
    }

    OnStopObserving {
      stopObserving()
    }

    OnDestroy {
      stopObserving()
    }
  }

  private fun context(): Context? = appContext.reactContext

  private fun audioManager(): AudioManager? {
    if (audioManager == null) {
      audioManager = context()?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }
    return audioManager
  }

  private fun startObserving() {
    if (observing) return
    val ctx = context() ?: return
    val am = audioManager() ?: return
    observing = true

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      deviceCallback = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>?) {
          sendStatus()
        }

        override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>?) {
          sendStatus()
        }
      }
      am.registerAudioDeviceCallback(deviceCallback, handler)
    }

    headsetReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        sendStatus()
      }
    }
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_HEADSET_PLUG)
      addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
    }
    ctx.registerReceiver(headsetReceiver, filter)
    sendStatus()
  }

  private fun stopObserving() {
    if (!observing) return
    observing = false
    val ctx = context()
    val am = audioManager()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      deviceCallback?.let { am?.unregisterAudioDeviceCallback(it) }
    }
    headsetReceiver?.let {
      try { ctx?.unregisterReceiver(it) } catch (_: Exception) {}
    }
    deviceCallback = null
    headsetReceiver = null
  }

  private fun sendStatus() {
    sendEvent("onChange", currentStatus())
  }

  private fun currentStatus(): Map<String, Any> {
    val am = audioManager() ?: return mapOf("connected" to false, "routeType" to "none")

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val outputs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      val hasWired = outputs.any {
        it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
          it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
          it.type == AudioDeviceInfo.TYPE_USB_HEADSET
      }
      val hasBluetooth = outputs.any {
        it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
          it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
          it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
          it.type == AudioDeviceInfo.TYPE_BLE_SPEAKER
      }
      if (hasWired) return mapOf("connected" to true, "routeType" to "wired")
      if (hasBluetooth) return mapOf("connected" to true, "routeType" to "bluetooth")
      return mapOf("connected" to false, "routeType" to "none")
    }

    val wired = am.isWiredHeadsetOn
    val bluetooth = am.isBluetoothA2dpOn || am.isBluetoothScoOn
    if (wired) return mapOf("connected" to true, "routeType" to "wired")
    if (bluetooth) return mapOf("connected" to true, "routeType" to "bluetooth")
    return mapOf("connected" to false, "routeType" to "none")
  }
}
