/**
 * @file main.cpp
 * @brief MEAN WELL NTU-1200-112US HMI Touch Control System
 * 
 * Hardware Target:
 *   - MCU: ESP32-S3 (8MB Flash, 8MB PSRAM)
 *   - Screen: 3.5" IPS 480x320 Capacitive Touch (ST7796 / ILI9488 + FT6336U / GT911)
 *   - Port: RJ11 Remote Port with Optocoupler-isolated RS-232 to TTL Module
 *   - Framework: Arduino + ESP-IDF FreeRTOS + LVGL 8.3 + LovyanGFX
 */

#include <Arduino.h>
#include <lvgl.h>
#define LGFX_USE_V1
#include <LovyanGFX.hpp>

#include "ntu_protocol.h"
#include "ntu_comm_task.h"
#include "ui_dashboard.h"

#ifndef NTU_UART_NUM
#define NTU_UART_NUM 2
#endif

#ifndef NTU_RX_PIN
#define NTU_RX_PIN 18  /* Connected to RS-232 to TTL Module TXD */
#endif

#ifndef NTU_TX_PIN
#define NTU_TX_PIN 17  /* Connected to RS-232 to TTL Module RXD */
#endif

#ifndef NTU_BAUD_RATE
#define NTU_BAUD_RATE 9600
#endif

#ifndef LCD_BL_PIN
#define LCD_BL_PIN 38  /* Backlight PWM Pin */
#endif

#define SCREEN_HOR_RES 480
#define SCREEN_VER_RES 320

/* ============================================================================
 * LovyanGFX Hardware Display & Touch Profile
 * Configured for typical ESP32-S3 3.5" (ST7796 / FT6336U or GT911)
 * ============================================================================ */
class LGFX_ESP32S3_35 : public lgfx::LGFX_Device {
    lgfx::Panel_ST7796  _panel_instance;
    lgfx::Bus_SPI       _bus_instance;
    lgfx::Light_PWM     _light_instance;
    lgfx::Touch_FT5x06  _touch_instance; /* Also compatible with FT6336U */

public:
    LGFX_ESP32S3_35() {
        {
            auto cfg = _bus_instance.config();
            cfg.spi_host = SPI2_HOST;
            cfg.spi_mode = 0;
            cfg.freq_write = 40000000;
            cfg.freq_read  = 16000000;
            cfg.spi_3wire  = false;
            cfg.use_lock   = true;
            cfg.dma_channel = SPI_DMA_CH_AUTO;
            cfg.pin_sclk = 12;
            cfg.pin_mosi = 13;
            cfg.pin_miso = 11;
            cfg.pin_dc   = 10;
            _bus_instance.config(cfg);
            _panel_instance.setBus(&_bus_instance);
        }

        {
            auto cfg = _panel_instance.config();
            cfg.pin_cs           = 9;
            cfg.pin_rst          = 14;
            cfg.pin_busy         = -1;
            cfg.memory_width     = 320;
            cfg.memory_height    = 480;
            cfg.panel_width      = 320;
            cfg.panel_height     = 480;
            cfg.offset_x         = 0;
            cfg.offset_y         = 0;
            cfg.offset_rotation  = 1; /* Landscape: 480 x 320 */
            cfg.dummy_read_pixel = 8;
            cfg.readable         = false;
            cfg.invert           = false;
            cfg.rgb_order        = false;
            cfg.dlen_16bit       = false;
            cfg.bus_shared       = false;
            _panel_instance.config(cfg);
        }

        {
            auto cfg = _light_instance.config();
            cfg.pin_bl = LCD_BL_PIN;
            cfg.freq   = 44100;
            cfg.pwm_channel = 0;
            _light_instance.config(cfg);
            _panel_instance.setLight(&_light_instance);
        }

        {
            auto cfg = _touch_instance.config();
            cfg.x_min      = 0;
            cfg.x_max      = 319;
            cfg.y_min      = 0;
            cfg.y_max      = 479;
            cfg.pin_int    = -1;
            cfg.bus_shared = false;
            cfg.offset_rotation = 1;
            cfg.i2c_port   = 0;
            cfg.i2c_addr   = 0x38;
            cfg.pin_sda    = 4;
            cfg.pin_scl    = 5;
            cfg.freq       = 400000;
            _touch_instance.config(cfg);
            _panel_instance.setTouch(&_touch_instance);
        }

        setPanel(&_panel_instance);
    }
};

static LGFX_ESP32S3_35 tft;

/* ============================================================================
 * LVGL Buffers and Drivers
 * ============================================================================ */
static lv_disp_draw_buf_t draw_buf;
static lv_color_t *buf1 = NULL;
static lv_color_t *buf2 = NULL;

/* Display flush callback */
static void my_disp_flush(lv_disp_drv_t *disp, const lv_area_t *area, lv_color_t *color_p) {
    uint32_t w = (area->x2 - area->x1 + 1);
    uint32_t h = (area->y2 - area->y1 + 1);

    tft.startWrite();
    tft.setAddrWindow(area->x1, area->y1, w, h);
    tft.writePixels((lgfx::rgb565_t *)&color_p->full, w * h);
    tft.endWrite();

    lv_disp_flush_ready(disp);
}

/* Touch input read callback */
static void my_touch_read(lv_indev_drv_t *indev_driver, lv_indev_data_t *data) {
    uint16_t touchX, touchY;
    bool touched = tft.getTouch(&touchX, &touchY);

    if (!touched) {
        data->state = LV_INDEV_STATE_REL;
    } else {
        data->state = LV_INDEV_STATE_PR;
        data->point.x = touchX;
        data->point.y = touchY;
    }
}

/* ============================================================================
 * FreeRTOS GUI Task (Core 1)
 * ============================================================================ */
static void gui_task(void *pvParameters) {
    uint32_t last_ui_update_ms = 0;
    NTU_DeviceState_t latest_state;

    while (1) {
        /* Run LVGL timers and render loops */
        lv_timer_handler();

        /* Refresh UI telemetry every 150ms */
        uint32_t now = millis();
        if (now - last_ui_update_ms >= 150) {
            last_ui_update_ms = now;
            if (NTU_GetDeviceState(&latest_state)) {
                UI_Dashboard_Update(&latest_state);
            }
        }

        /* Yield ~5ms to maintain smooth 60fps interaction */
        vTaskDelay(pdMS_TO_TICKS(5));
    }
}

/* ============================================================================
 * Arduino Setup & Loop
 * ============================================================================ */
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n[BOOT] Starting MEAN WELL NTU-1200-112US HMI System...");

    /* 1. Initialize LCD Display and Touch */
    tft.init();
    tft.setRotation(1); /* Landscape 480x320 */
    tft.setBrightness(220);

    /* 2. Initialize LVGL 8.3 */
    lv_init();

    /* Allocate framebuffers in PSRAM if available */
    size_t buf_size = SCREEN_HOR_RES * 40; // 40-line buffer for memory efficiency
    if (psramFound()) {
        buf1 = (lv_color_t *)ps_malloc(buf_size * sizeof(lv_color_t));
        buf2 = (lv_color_t *)ps_malloc(buf_size * sizeof(lv_color_t));
    } else {
        buf1 = (lv_color_t *)malloc(buf_size * sizeof(lv_color_t));
        buf2 = (lv_color_t *)malloc(buf_size * sizeof(lv_color_t));
    }

    if (!buf1) {
        Serial.println("[ERR] Framebuffer allocation failed!");
        while (1) delay(1000);
    }

    lv_disp_draw_buf_init(&draw_buf, buf1, buf2, buf_size);

    /* Register Display Driver */
    static lv_disp_drv_t disp_drv;
    lv_disp_drv_init(&disp_drv);
    disp_drv.hor_res = SCREEN_HOR_RES;
    disp_drv.ver_res = SCREEN_VER_RES;
    disp_drv.flush_cb = my_disp_flush;
    disp_drv.draw_buf = &draw_buf;
    lv_disp_drv_register(&disp_drv);

    /* Register Touch Input Driver */
    static lv_indev_drv_t indev_drv;
    lv_indev_drv_init(&indev_drv);
    indev_drv.type = LV_INDEV_TYPE_POINTER;
    indev_drv.read_cb = my_touch_read;
    lv_indev_drv_register(&indev_drv);

    /* 3. Build Industrial Dashboard UI */
    UI_Dashboard_Init();
    Serial.println("[UI] LVGL 8.3 Dashboard initialized successfully.");

    /* 4. Start NTU RS-232 UART FreeRTOS Task (Core 0) */
    bool comm_ok = NTU_CommTask_Init(NTU_UART_NUM, NTU_RX_PIN, NTU_TX_PIN, NTU_BAUD_RATE);
    if (comm_ok) {
        Serial.println("[COMM] NTU UART2 background task running on Core 0 (9600-8-N-1).");
    } else {
        Serial.println("[ERR] Failed to start NTU UART communication task!");
    }

    /* 5. Start GUI FreeRTOS Task (Core 1) */
    xTaskCreatePinnedToCore(
        gui_task,
        "gui_task",
        8192,
        NULL,
        2,              /* Priority 2 */
        NULL,
        1               /* Core 1 */
    );
    Serial.println("[GUI] GUI task running on Core 1.");
}

void loop() {
    /* Main loop remains idle; FreeRTOS dual-tasks handle execution */
    vTaskDelay(pdMS_TO_TICKS(1000));
}
