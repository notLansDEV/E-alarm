package expo.modules.timerforegroundservice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

class TimerForegroundService : Service() {
  companion object {
    const val CHANNEL_ID = "timer_foreground"
    const val DONE_CHANNEL_ID = "timer_foreground_done"
    const val NOTIF_ID = 7701
    const val DONE_NOTIF_ID = 7702
    const val EXTRA_END_AT = "endAtMillis"
    const val ACTION_STOP = "expo.modules.timerforegroundservice.STOP"

    fun start(context: Context, endAtMillis: Long) {
      val intent = Intent(context, TimerForegroundService::class.java).apply {
        putExtra(EXTRA_END_AT, endAtMillis)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, TimerForegroundService::class.java))
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private var endAtMillis: Long = 0L
  private val tick = object : Runnable {
    override fun run() {
      val left = remainingSeconds()
      updateNotification(left)
      if (left <= 0) {
        showDoneNotification()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      } else {
        handler.postDelayed(this, 1000)
      }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      handler.removeCallbacks(tick)
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }

    val newEndAt = intent?.getLongExtra(EXTRA_END_AT, 0L) ?: 0L
    if (newEndAt > 0L) endAtMillis = newEndAt
    if (endAtMillis <= 0L) {
      stopSelf()
      return START_NOT_STICKY
    }

    ensureChannels()
    val left = remainingSeconds()
    ServiceCompat.startForeground(
      this,
      NOTIF_ID,
      buildNotification(left, left > 0),
      if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
    )
    handler.removeCallbacks(tick)
    handler.post(tick)
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    super.onDestroy()
  }

  private fun remainingSeconds(): Int {
    val ms = endAtMillis - System.currentTimeMillis()
    return ((ms + 500) / 1000).toInt().coerceAtLeast(0)
  }

  private fun formatTime(totalSeconds: Int): String {
    val h = totalSeconds / 3600
    val m = (totalSeconds % 3600) / 60
    val s = totalSeconds % 60
    return String.format("%02d:%02d:%02d", h, m, s)
  }

  private fun ensureChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(NotificationManager::class.java)
    val running = NotificationChannel(CHANNEL_ID, "Timer running", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Shows timer countdown while running"
      setSound(null, null)
      enableVibration(false)
    }
    val done = NotificationChannel(DONE_CHANNEL_ID, "Timer finished", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Notifies when timer finishes"
      enableVibration(true)
    }
    nm.createNotificationChannel(running)
    nm.createNotificationChannel(done)
  }

  private fun buildNotification(secondsLeft: Int, ongoing: Boolean): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pi = if (launchIntent != null) {
      PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    } else null

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(if (secondsLeft > 0) "Timer running" else "Timer finished")
      .setContentText(formatTime(secondsLeft))
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setOngoing(ongoing)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setContentIntent(pi)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .build()
  }

  private fun updateNotification(secondsLeft: Int) {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(NOTIF_ID, buildNotification(secondsLeft, secondsLeft > 0))
  }

  private fun showDoneNotification() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pi = if (launchIntent != null) {
      PendingIntent.getActivity(this, 1, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    } else null

    val n = NotificationCompat.Builder(this, DONE_CHANNEL_ID)
      .setContentTitle("Timer finished")
      .setContentText("00:00:00")
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setAutoCancel(true)
      .setContentIntent(pi)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .build()
    nm.notify(DONE_NOTIF_ID, n)
  }
}
