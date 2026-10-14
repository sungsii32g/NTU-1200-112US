package com.meanwell.ntu1200

import android.app.Application

class HmiApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: HmiApplication
            private set
    }
}
