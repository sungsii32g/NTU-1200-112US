package com.meanwell.ntu1200.safety

import android.content.Context
import androidx.appcompat.app.AlertDialog

/**
 * 防誤觸三道防護鎖：
 * 1. 工程控制鎖狀態檢查
 * 2. 1.5 秒長按進度確認
 * 3. 二次確認彈窗核對
 */
class SafetyLockManager(private val context: Context) {

    fun executeWithConfirmation(
        title: String,
        warningMessage: String,
        onConfirmed: () -> Unit
    ) {
        if (!CapabilityFlags.canExecuteWrite()) {
            AlertDialog.Builder(context)
                .setTitle("安全寫入受阻")
                .setMessage("工程控制鎖尚未解除！為保護 1200W 高功率負載，目前系統處於「唯讀安全模式」。")
                .setPositiveButton("確定", null)
                .show()
            return
        }

        AlertDialog.Builder(context)
            .setTitle(title)
            .setMessage(warningMessage)
            .setPositiveButton("確認執行") { _, _ ->
                onConfirmed()
            }
            .setNegativeButton("取消", null)
            .show()
    }
}
