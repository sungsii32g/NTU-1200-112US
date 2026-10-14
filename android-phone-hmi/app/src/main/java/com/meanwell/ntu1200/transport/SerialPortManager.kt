package com.meanwell.ntu1200.transport

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Log
import com.hoho.android.usbserial.driver.UsbSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber
import com.meanwell.ntu1200.protocol.NtuCommandSpec
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.IOException

class SerialPortManager(private val context: Context) {
    private val TAG = "SerialPortManager"
    private val ACTION_USB_PERMISSION = "com.meanwell.ntu1200.USB_PERMISSION"

    private val usbManager: UsbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private var usbSerialPort: UsbSerialPort? = null

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _deviceInfo = MutableStateFlow("未連接設備")
    val deviceInfo: StateFlow<String> = _deviceInfo.asStateFlow()

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        }
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let { openDevice(it) }
                        } else {
                            Log.w(TAG, "USB 權限被拒絕")
                            _deviceInfo.value = "USB 權限遭拒"
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    Log.i(TAG, "USB 設備插入，自動嘗試連線")
                    connectAvailableDevice()
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    Log.i(TAG, "USB 設備拔除，釋放連線")
                    disconnect()
                }
            }
        }
    }

    init {
        val filter = IntentFilter(ACTION_USB_PERMISSION).apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(usbReceiver, filter)
        }
    }

    fun connectAvailableDevice(): Boolean {
        val availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
        if (availableDrivers.isEmpty()) {
            _deviceInfo.value = "未偵測到 USB-RS232 轉換器"
            return false
        }

        val driver: UsbSerialDriver = availableDrivers[0]
        val device = driver.device

        if (!usbManager.hasPermission(device)) {
            Log.i(TAG, "尚未取得 USB 權限，發起請求: ${device.deviceName}")
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            val permissionIntent = PendingIntent.getBroadcast(
                context, 0, Intent(ACTION_USB_PERMISSION), flags
            )
            usbManager.requestPermission(device, permissionIntent)
            return false
        }

        return openDriver(driver)
    }

    private fun openDevice(device: UsbDevice): Boolean {
        val availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
        for (driver in availableDrivers) {
            if (driver.device.deviceId == device.deviceId) {
                return openDriver(driver)
            }
        }
        return false
    }

    private fun openDriver(driver: UsbSerialDriver): Boolean {
        val connection = usbManager.openDevice(driver.device) ?: run {
            _deviceInfo.value = "無法開啟 USB 連接 (openDevice 失敗)"
            return false
        }

        val port = driver.ports[0] // 取得第一個埠
        try {
            port.open(connection)
            // 9600-8-N-1 嚴格符合明緯官方規格
            port.setParameters(
                NtuCommandSpec.BAUD_RATE,
                NtuCommandSpec.DATA_BITS,
                UsbSerialPort.STOPBITS_1,
                UsbSerialPort.PARITY_NONE
            )
            port.dtr = true
            port.rts = true

            usbSerialPort = port
            _isConnected.value = true
            _deviceInfo.value = "${driver.device.manufacturerName ?: "FTDI/CH340"} (${driver.device.deviceName})"
            Log.i(TAG, "USB 串列埠成功開啟: 9600-8-N-1")
            return true
        } catch (e: IOException) {
            Log.e(TAG, "初始化串列埠失敗: ${e.message}", e)
            try {
                port.close()
            } catch (ignored: Exception) {}
            _isConnected.value = false
            _deviceInfo.value = "連線失敗: ${e.localizedMessage}"
            return false
        }
    }

    @Synchronized
    fun write(data: ByteArray) {
        val port = usbSerialPort ?: throw IOException("串口未連接")
        port.write(data, NtuCommandSpec.READ_TIMEOUT_MS.toInt())
    }

    @Synchronized
    fun read(buffer: ByteArray, timeoutMs: Int): Int {
        val port = usbSerialPort ?: throw IOException("串口未連接")
        return port.read(buffer, timeoutMs)
    }

    @Synchronized
    fun disconnect() {
        try {
            usbSerialPort?.close()
        } catch (ignored: Exception) {}
        usbSerialPort = null
        _isConnected.value = false
        _deviceInfo.value = "未連接"
    }

    fun destroy() {
        disconnect()
        try {
            context.unregisterReceiver(usbReceiver)
        } catch (ignored: Exception) {}
    }
}
