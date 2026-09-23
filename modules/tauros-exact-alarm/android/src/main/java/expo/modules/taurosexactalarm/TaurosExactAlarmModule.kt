package expo.modules.taurosexactalarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Exposes the Android 12+ exact-alarm permission state, which expo-notifications
 * does not surface. Without it, scheduled notifications fall back to inexact
 * alarms and the rest alarm can fire minutes late.
 */
class TaurosExactAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TaurosExactAlarm")

    Function("canScheduleExactAlarms") {
      val context = appContext.reactContext
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && context != null) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.canScheduleExactAlarms()
      } else {
        true
      }
    }

    Function("openExactAlarmSettings") {
      val context = appContext.reactContext
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && context != null) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        true
      } else {
        false
      }
    }
  }
}
