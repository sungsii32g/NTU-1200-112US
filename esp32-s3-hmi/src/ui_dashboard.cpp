/**
 * @file ui_dashboard.cpp
 * @brief LVGL 8.3 GUI Implementation for MEAN WELL NTU-1200-112US HMI System
 */

#include "ui_dashboard.h"
#include "ntu_comm_task.h"
#include <stdio.h>

#ifndef LCD_BL_PIN
#define LCD_BL_PIN 38
#endif

/* Theme Color Palette */
#define UI_COLOR_BG          lv_color_hex(0x0F1318)
#define UI_COLOR_CARD        lv_color_hex(0x181F28)
#define UI_COLOR_CARD_BORDER lv_color_hex(0x283444)
#define UI_COLOR_TEXT_MAIN   lv_color_hex(0xF0F4F8)
#define UI_COLOR_TEXT_MUTED  lv_color_hex(0x8291A4)
#define UI_COLOR_GREEN       lv_color_hex(0x00E676)
#define UI_COLOR_BLUE        lv_color_hex(0x00B0FF)
#define UI_COLOR_ORANGE      lv_color_hex(0xFF9100)
#define UI_COLOR_RED         lv_color_hex(0xFF1744)

static uint8_t s_backlight_percent = 90;

/* Header Widgets */
static lv_obj_t *s_lbl_header_title;
static lv_obj_t *s_led_comm_status;
static lv_obj_t *s_lbl_comm_status;
static lv_obj_t *s_lbl_mode_badge;
static lv_obj_t *s_lbl_uptime;

/* Tab 1: Dashboard Widgets */
static lv_obj_t *s_lbl_flow_utility;
static lv_obj_t *s_lbl_flow_bypass;
static lv_obj_t *s_lbl_flow_inv;
static lv_obj_t *s_lbl_flow_bat;
static lv_obj_t *s_lbl_flow_ac_out;

static lv_obj_t *s_arc_bat;
static lv_obj_t *s_lbl_bat_val;
static lv_obj_t *s_lbl_bat_state;

static lv_obj_t *s_arc_load;
static lv_obj_t *s_lbl_load_val;
static lv_obj_t *s_lbl_load_watts;

static lv_obj_t *s_lbl_temp_val;

/* Tab 2: Telemetry Widgets */
static lv_obj_t *s_lbl_telem_vbat;
static lv_obj_t *s_lbl_telem_vac;
static lv_obj_t *s_lbl_telem_vgrid;
static lv_obj_t *s_lbl_telem_freq;
static lv_obj_t *s_lbl_telem_load;
static lv_obj_t *s_lbl_telem_watts;
static lv_obj_t *s_lbl_telem_temp;
static lv_obj_t *s_lbl_telem_vdc;

static lv_obj_t *s_chart_trend;
static lv_chart_series_t *s_ser_bat;
static lv_chart_series_t *s_ser_load;

/* Tab 3: Control Widgets */
static lv_obj_t *s_sw_ac_output;
static lv_obj_t *s_lbl_ac_out_state;
static lv_obj_t *s_sw_saving_mode;
static lv_obj_t *s_msgbox_confirm = NULL;
static bool s_pending_output_state = false;

/* Tab 4: Alarms Widgets */
static lv_obj_t *s_lbl_alarm_banner;
static lv_obj_t *s_list_alarm_log;

/* Tab 5: Settings Widgets */
static lv_obj_t *s_slider_backlight;
static lv_obj_t *s_lbl_bl_val;
static lv_obj_t *s_sw_demo_mode;
static lv_obj_t *s_lbl_uart_stats;
static lv_obj_t *s_ta_raw_monitor;

/* Common Styles */
static lv_style_t s_style_card;
static lv_style_t s_style_text_title;
static lv_style_t s_style_text_val;

void UI_SetBacklight(uint8_t percent) {
    if (percent > 100) percent = 100;
    s_backlight_percent = percent;
    /* Arduino ESP32 LEDC PWM control */
    #if defined(ARDUINO)
    ledcWrite(0, (uint32_t)(percent * 255 / 100));
    #endif
}

uint8_t UI_GetBacklight(void) {
    return s_backlight_percent;
}

/* ============================================================================
 * Event Handlers
 * ============================================================================ */

static void msgbox_confirm_event_cb(lv_event_t *e) {
    lv_obj_t *btn = lv_event_get_target(e);
    lv_obj_t *mbox = lv_obj_get_parent(btn);
    const char *txt = lv_msgbox_get_active_btn_text(mbox);

    if (txt && strcmp(txt, "確認切換") == 0) {
        NTU_ControlCommand_t cmd;
        cmd.type = s_pending_output_state ? NTU_CMD_OUTPUT_ON : NTU_CMD_OUTPUT_OFF;
        NTU_SendCommand(&cmd);
        lv_label_set_text(s_lbl_ac_out_state, s_pending_output_state ? "開啟中 (ON)" : "已關閉 (OFF)");
    } else {
        /* User cancelled: revert switch state */
        if (s_pending_output_state) {
            lv_obj_clear_state(s_sw_ac_output, LV_STATE_CHECKED);
        } else {
            lv_obj_add_state(s_sw_ac_output, LV_STATE_CHECKED);
        }
    }
    lv_msgbox_close(mbox);
    s_msgbox_confirm = NULL;
}

static void sw_ac_output_event_cb(lv_event_t *e) {
    lv_obj_t *sw = lv_event_get_target(e);
    s_pending_output_state = lv_obj_has_state(sw, LV_STATE_CHECKED);

    if (s_msgbox_confirm != NULL) return;

    static const char *btns[] = {"取消", "確認切換", ""};
    s_msgbox_confirm = lv_msgbox_create(
        NULL,
        "⚠️ 安全二次確認",
        s_pending_output_state ? 
            "是否確定開啟 NTU-1200 逆變器 AC 輸出？" :
            "注意！關閉 AC 輸出將造成後端插座負載瞬間斷電！",
        btns,
        false
    );
    lv_obj_center(s_msgbox_confirm);
    lv_obj_add_event_cb(s_msgbox_confirm, msgbox_confirm_event_cb, LV_EVENT_VALUE_CHANGED, NULL);
}

static void sw_saving_mode_event_cb(lv_event_t *e) {
    lv_obj_t *sw = lv_event_get_target(e);
    bool en = lv_obj_has_state(sw, LV_STATE_CHECKED);
    NTU_ControlCommand_t cmd;
    cmd.type = en ? NTU_CMD_SAVING_MODE_ON : NTU_CMD_SAVING_MODE_OFF;
    NTU_SendCommand(&cmd);
}

static void slider_backlight_event_cb(lv_event_t *e) {
    lv_obj_t *slider = lv_event_get_target(e);
    int val = lv_slider_get_value(slider);
    UI_SetBacklight((uint8_t)val);
    char buf[16];
    snprintf(buf, sizeof(buf), "%d %%", val);
    lv_label_set_text(s_lbl_bl_val, buf);
}

static void sw_demo_mode_event_cb(lv_event_t *e) {
    lv_obj_t *sw = lv_event_get_target(e);
    bool en = lv_obj_has_state(sw, LV_STATE_CHECKED);
    NTU_SetDemoMode(en);
}

/* ============================================================================
 * UI Page Construction
 * ============================================================================ */

static void init_styles(void) {
    lv_style_init(&s_style_card);
    lv_style_set_bg_color(&s_style_card, UI_COLOR_CARD);
    lv_style_set_bg_opa(&s_style_card, LV_OPA_COVER);
    lv_style_set_border_color(&s_style_card, UI_COLOR_CARD_BORDER);
    lv_style_set_border_width(&s_style_card, 1);
    lv_style_set_radius(&s_style_card, 8);
    lv_style_set_pad_all(&s_style_card, 6);

    lv_style_init(&s_style_text_title);
    lv_style_set_text_color(&s_style_text_title, UI_COLOR_TEXT_MUTED);
    lv_style_set_text_font(&s_style_text_title, &lv_font_montserrat_12);

    lv_style_init(&s_style_text_val);
    lv_style_set_text_color(&s_style_text_val, UI_COLOR_TEXT_MAIN);
    lv_style_set_text_font(&s_style_text_val, &lv_font_montserrat_18);
}

static void create_header(lv_obj_t *parent) {
    lv_obj_t *header = lv_obj_create(parent);
    lv_obj_set_size(header, 480, 36);
    lv_obj_set_pos(header, 0, 0);
    lv_obj_set_style_bg_color(header, lv_color_hex(0x131922), 0);
    lv_obj_set_style_border_side(header, LV_BORDER_SIDE_BOTTOM, 0);
    lv_obj_set_style_border_color(header, UI_COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(header, 1, 0);
    lv_obj_set_style_radius(header, 0, 0);
    lv_obj_set_style_pad_all(header, 4, 0);
    lv_obj_clear_flag(header, LV_OBJ_FLAG_SCROLLABLE);

    /* Title */
    s_lbl_header_title = lv_label_create(header);
    lv_label_set_text(s_lbl_header_title, "NTU-1200-112US");
    lv_obj_set_style_text_font(s_lbl_header_title, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(s_lbl_header_title, lv_color_hex(0x00E5FF), 0);
    lv_obj_align(s_lbl_header_title, LV_ALIGN_LEFT_MID, 6, 0);

    /* Mode Badge */
    s_lbl_mode_badge = lv_label_create(header);
    lv_label_set_text(s_lbl_mode_badge, "[UPS市電旁路]");
    lv_obj_set_style_text_font(s_lbl_mode_badge, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_mode_badge, UI_COLOR_BLUE, 0);
    lv_obj_align(s_lbl_mode_badge, LV_ALIGN_LEFT_MID, 160, 0);

    /* Status LED & Label */
    s_led_comm_status = lv_led_create(header);
    lv_obj_set_size(s_led_comm_status, 10, 10);
    lv_led_set_color(s_led_comm_status, UI_COLOR_GREEN);
    lv_led_on(s_led_comm_status);
    lv_obj_align(s_led_comm_status, LV_ALIGN_RIGHT_MID, -115, 0);

    s_lbl_comm_status = lv_label_create(header);
    lv_label_set_text(s_lbl_comm_status, "連線正常");
    lv_obj_set_style_text_font(s_lbl_comm_status, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_comm_status, UI_COLOR_GREEN, 0);
    lv_obj_align(s_lbl_comm_status, LV_ALIGN_RIGHT_MID, -60, 0);

    /* Uptime */
    s_lbl_uptime = lv_label_create(header);
    lv_label_set_text(s_lbl_uptime, "00:00");
    lv_obj_set_style_text_font(s_lbl_uptime, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_uptime, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(s_lbl_uptime, LV_ALIGN_RIGHT_MID, -6, 0);
}

/* ============================================================================
 * Tab 1: Dashboard Setup
 * ============================================================================ */
static void create_tab_dashboard(lv_obj_t *tab) {
    lv_obj_clear_flag(tab, LV_OBJ_FLAG_SCROLLABLE);

    /* 1. Power Flow Topology Card */
    lv_obj_t *flow_card = lv_obj_create(tab);
    lv_obj_add_style(flow_card, &s_style_card, 0);
    lv_obj_set_size(flow_card, 464, 48);
    lv_obj_set_pos(flow_card, 0, 0);
    lv_obj_clear_flag(flow_card, LV_OBJ_FLAG_SCROLLABLE);

    s_lbl_flow_utility = lv_label_create(flow_card);
    lv_label_set_text(s_lbl_flow_utility, "市電 110V");
    lv_obj_set_style_text_font(s_lbl_flow_utility, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_flow_utility, UI_COLOR_BLUE, 0);
    lv_obj_align(s_lbl_flow_utility, LV_ALIGN_LEFT_MID, 6, -10);

    s_lbl_flow_bypass = lv_label_create(flow_card);
    lv_label_set_text(s_lbl_flow_bypass, "──▶ [UPS 旁路切換] ──▶");
    lv_obj_set_style_text_font(s_lbl_flow_bypass, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(s_lbl_flow_bypass, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(s_lbl_flow_bypass, LV_ALIGN_CENTER, 0, -10);

    s_lbl_flow_bat = lv_label_create(flow_card);
    lv_label_set_text(s_lbl_flow_bat, "電池 12.6V");
    lv_obj_set_style_text_font(s_lbl_flow_bat, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_flow_bat, UI_COLOR_GREEN, 0);
    lv_obj_align(s_lbl_flow_bat, LV_ALIGN_LEFT_MID, 6, 12);

    s_lbl_flow_inv = lv_label_create(flow_card);
    lv_label_set_text(s_lbl_flow_inv, "──▶ [DC-AC 逆變] ──▶");
    lv_obj_set_style_text_font(s_lbl_flow_inv, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(s_lbl_flow_inv, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(s_lbl_flow_inv, LV_ALIGN_CENTER, 0, 12);

    s_lbl_flow_ac_out = lv_label_create(flow_card);
    lv_label_set_text(s_lbl_flow_ac_out, "AC 輸出: 110V (420W)");
    lv_obj_set_style_text_font(s_lbl_flow_ac_out, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_flow_ac_out, UI_COLOR_TEXT_MAIN, 0);
    lv_obj_align(s_lbl_flow_ac_out, LV_ALIGN_RIGHT_MID, -6, 0);

    /* 2. Three Circular Gauges / Cards */
    /* Arc 1: Battery Voltage */
    lv_obj_t *c_bat = lv_obj_create(tab);
    lv_obj_add_style(c_bat, &s_style_card, 0);
    lv_obj_set_size(c_bat, 150, 180);
    lv_obj_set_pos(c_bat, 0, 54);
    lv_obj_clear_flag(c_bat, LV_OBJ_FLAG_SCROLLABLE);

    s_arc_bat = lv_arc_create(c_bat);
    lv_obj_set_size(s_arc_bat, 120, 120);
    lv_arc_set_range(s_arc_bat, 90, 170); // 9.0V to 17.0V
    lv_arc_set_value(s_arc_bat, 126);
    lv_arc_set_bg_angles(s_arc_bat, 135, 45);
    lv_obj_set_style_arc_color(s_arc_bat, UI_COLOR_GREEN, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(s_arc_bat, 10, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(s_arc_bat, 10, LV_PART_MAIN);
    lv_obj_remove_style(s_arc_bat, NULL, LV_PART_KNOB);
    lv_obj_clear_flag(s_arc_bat, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_align(s_arc_bat, LV_ALIGN_TOP_MID, 0, 2);

    s_lbl_bat_val = lv_label_create(c_bat);
    lv_label_set_text(s_lbl_bat_val, "12.6 V");
    lv_obj_add_style(s_lbl_bat_val, &s_style_text_val, 0);
    lv_obj_align(s_lbl_bat_val, LV_ALIGN_CENTER, 0, -4);

    s_lbl_bat_state = lv_label_create(c_bat);
    lv_label_set_text(s_lbl_bat_state, "電池電壓 (正常)");
    lv_obj_add_style(s_lbl_bat_state, &s_style_text_title, 0);
    lv_obj_align(s_lbl_bat_state, LV_ALIGN_BOTTOM_MID, 0, -4);

    /* Arc 2: AC Load Percentage */
    lv_obj_t *c_load = lv_obj_create(tab);
    lv_obj_add_style(c_load, &s_style_card, 0);
    lv_obj_set_size(c_load, 150, 180);
    lv_obj_set_pos(c_load, 157, 54);
    lv_obj_clear_flag(c_load, LV_OBJ_FLAG_SCROLLABLE);

    s_arc_load = lv_arc_create(c_load);
    lv_obj_set_size(s_arc_load, 120, 120);
    lv_arc_set_range(s_arc_load, 0, 120);
    lv_arc_set_value(s_arc_load, 35);
    lv_arc_set_bg_angles(s_arc_load, 135, 45);
    lv_obj_set_style_arc_color(s_arc_load, UI_COLOR_BLUE, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(s_arc_load, 10, LV_PART_INDICATOR);
    lv_obj_set_style_arc_width(s_arc_load, 10, LV_PART_MAIN);
    lv_obj_remove_style(s_arc_load, NULL, LV_PART_KNOB);
    lv_obj_clear_flag(s_arc_load, LV_OBJ_FLAG_CLICKABLE);
    lv_obj_align(s_arc_load, LV_ALIGN_TOP_MID, 0, 2);

    s_lbl_load_val = lv_label_create(c_load);
    lv_label_set_text(s_lbl_load_val, "35 %");
    lv_obj_add_style(s_lbl_load_val, &s_style_text_val, 0);
    lv_obj_align(s_lbl_load_val, LV_ALIGN_CENTER, 0, -12);

    s_lbl_load_watts = lv_label_create(c_load);
    lv_label_set_text(s_lbl_load_watts, "420 W");
    lv_obj_set_style_text_font(s_lbl_load_watts, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_load_watts, UI_COLOR_BLUE, 0);
    lv_obj_align(s_lbl_load_watts, LV_ALIGN_CENTER, 0, 8);

    lv_obj_t *lbl_l_tit = lv_label_create(c_load);
    lv_label_set_text(lbl_l_tit, "輸出負載 (額定1200W)");
    lv_obj_add_style(lbl_l_tit, &s_style_text_title, 0);
    lv_obj_align(lbl_l_tit, LV_ALIGN_BOTTOM_MID, 0, -4);

    /* Card 3: Metrics & Temperature */
    lv_obj_t *c_temp = lv_obj_create(tab);
    lv_obj_add_style(c_temp, &s_style_card, 0);
    lv_obj_set_size(c_temp, 150, 180);
    lv_obj_set_pos(c_temp, 314, 54);
    lv_obj_clear_flag(c_temp, LV_OBJ_FLAG_SCROLLABLE);

    lv_obj_t *lbl_t_tit = lv_label_create(c_temp);
    lv_label_set_text(lbl_t_tit, "機內運作溫度");
    lv_obj_add_style(lbl_t_tit, &s_style_text_title, 0);
    lv_obj_align(lbl_t_tit, LV_ALIGN_TOP_MID, 0, 4);

    s_lbl_temp_val = lv_label_create(c_temp);
    lv_label_set_text(s_lbl_temp_val, "38.5 °C");
    lv_obj_set_style_text_font(s_lbl_temp_val, &lv_font_montserrat_24, 0);
    lv_obj_set_style_text_color(s_lbl_temp_val, UI_COLOR_GREEN, 0);
    lv_obj_align(s_lbl_temp_val, LV_ALIGN_CENTER, 0, -20);

    lv_obj_t *lbl_spec1 = lv_label_create(c_temp);
    lv_label_set_text(lbl_spec1, "額定容量: 1200W\n峰值功率: 2000W\n標稱交流: 110V 60Hz");
    lv_obj_set_style_text_font(lbl_spec1, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(lbl_spec1, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(lbl_spec1, LV_ALIGN_BOTTOM_LEFT, 4, -6);
}

/* ============================================================================
 * Tab 2: Telemetry Setup
 * ============================================================================ */
static void create_tab_telemetry(lv_obj_t *tab) {
    /* 1. Left Telemetry Card Table */
    lv_obj_t *t_card = lv_obj_create(tab);
    lv_obj_add_style(t_card, &s_style_card, 0);
    lv_obj_set_size(t_card, 210, 234);
    lv_obj_set_pos(t_card, 0, 0);
    lv_obj_set_style_pad_all(t_card, 6, 0);

    lv_obj_t *lbl_tit = lv_label_create(t_card);
    lv_label_set_text(lbl_tit, "即時電力遙測 (Telemetry)");
    lv_obj_set_style_text_font(lbl_tit, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(lbl_tit, UI_COLOR_BLUE, 0);
    lv_obj_align(lbl_tit, LV_ALIGN_TOP_LEFT, 2, 0);

    s_lbl_telem_vbat  = lv_label_create(t_card);
    s_lbl_telem_vac   = lv_label_create(t_card);
    s_lbl_telem_vgrid = lv_label_create(t_card);
    s_lbl_telem_freq  = lv_label_create(t_card);
    s_lbl_telem_load  = lv_label_create(t_card);
    s_lbl_telem_watts = lv_label_create(t_card);
    s_lbl_telem_temp  = lv_label_create(t_card);
    s_lbl_telem_vdc   = lv_label_create(t_card);

    lv_obj_t *items[] = {
        s_lbl_telem_vbat, s_lbl_telem_vac, s_lbl_telem_vgrid, s_lbl_telem_freq,
        s_lbl_telem_load, s_lbl_telem_watts, s_lbl_telem_temp, s_lbl_telem_vdc
    };

    for (int i = 0; i < 8; i++) {
        lv_obj_set_style_text_font(items[i], &lv_font_montserrat_12, 0);
        lv_obj_set_style_text_color(items[i], UI_COLOR_TEXT_MAIN, 0);
        lv_obj_set_pos(items[i], 4, 22 + i * 24);
    }

    lv_label_set_text(s_lbl_telem_vbat,  "電池電壓: 12.6 V");
    lv_label_set_text(s_lbl_telem_vac,   "輸出電壓: 110.0 V");
    lv_label_set_text(s_lbl_telem_vgrid, "市電電壓: 110.2 V");
    lv_label_set_text(s_lbl_telem_freq,  "輸出頻率: 60.0 Hz");
    lv_label_set_text(s_lbl_telem_load,  "負載比例: 35 %");
    lv_label_set_text(s_lbl_telem_watts, "輸出功率: 420 W");
    lv_label_set_text(s_lbl_telem_temp,  "機內溫度: 38.5 °C");
    lv_label_set_text(s_lbl_telem_vdc,   "高壓母線: 162.0 V");

    /* 2. Right Trend Chart Card */
    lv_obj_t *ch_card = lv_obj_create(tab);
    lv_obj_add_style(ch_card, &s_style_card, 0);
    lv_obj_set_size(ch_card, 250, 234);
    lv_obj_set_pos(ch_card, 214, 0);

    lv_obj_t *ch_tit = lv_label_create(ch_card);
    lv_label_set_text(ch_tit, "即時趨勢曲線 (綠: 電池V, 藍: 負載%)");
    lv_obj_set_style_text_font(ch_tit, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(ch_tit, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(ch_tit, LV_ALIGN_TOP_LEFT, 2, 0);

    s_chart_trend = lv_chart_create(ch_card);
    lv_obj_set_size(s_chart_trend, 236, 190);
    lv_obj_align(s_chart_trend, LV_ALIGN_BOTTOM_MID, 0, -2);
    lv_chart_set_type(s_chart_trend, LV_CHART_TYPE_LINE);
    lv_chart_set_point_count(s_chart_trend, 24);
    lv_chart_set_range(s_chart_trend, LV_CHART_AXIS_PRIMARY_Y, 0, 100);
    lv_obj_set_style_bg_color(s_chart_trend, lv_color_hex(0x10151C), 0);
    lv_obj_set_style_border_width(s_chart_trend, 0, 0);

    s_ser_bat = lv_chart_add_series(s_chart_trend, UI_COLOR_GREEN, LV_CHART_AXIS_PRIMARY_Y);
    s_ser_load = lv_chart_add_series(s_chart_trend, UI_COLOR_BLUE, LV_CHART_AXIS_PRIMARY_Y);

    for (int i = 0; i < 24; i++) {
        lv_chart_set_next_value(s_chart_trend, s_ser_bat, 70);
        lv_chart_set_next_value(s_chart_trend, s_ser_load, 35);
    }
}

/* ============================================================================
 * Tab 3: Control Setup
 * ============================================================================ */
static void create_tab_control(lv_obj_t *tab) {
    /* 1. Master AC Inverter Output Switch with Interlock */
    lv_obj_t *c1 = lv_obj_create(tab);
    lv_obj_add_style(c1, &s_style_card, 0);
    lv_obj_set_size(c1, 464, 76);
    lv_obj_set_pos(c1, 0, 0);

    lv_obj_t *lbl_ac_tit = lv_label_create(c1);
    lv_label_set_text(lbl_ac_tit, "逆變器交流輸出開關 (AC Output Switch)");
    lv_obj_set_style_text_font(lbl_ac_tit, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(lbl_ac_tit, UI_COLOR_TEXT_MAIN, 0);
    lv_obj_align(lbl_ac_tit, LV_ALIGN_TOP_LEFT, 4, 4);

    lv_obj_t *lbl_ac_sub = lv_label_create(c1);
    lv_label_set_text(lbl_ac_sub, "具備安全互鎖保護：點擊開關需進行二次彈窗確認，避免誤碰中斷負載！");
    lv_obj_set_style_text_font(lbl_ac_sub, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(lbl_ac_sub, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(lbl_ac_sub, LV_ALIGN_TOP_LEFT, 4, 26);

    s_sw_ac_output = lv_switch_create(c1);
    lv_obj_set_size(s_sw_ac_output, 58, 28);
    lv_obj_align(s_sw_ac_output, LV_ALIGN_RIGHT_MID, -8, 2);
    lv_obj_add_state(s_sw_ac_output, LV_STATE_CHECKED); // Default ON
    lv_obj_add_event_cb(s_sw_ac_output, sw_ac_output_event_cb, LV_EVENT_VALUE_CHANGED, NULL);

    s_lbl_ac_out_state = lv_label_create(c1);
    lv_label_set_text(s_lbl_ac_out_state, "開啟中 (ON)");
    lv_obj_set_style_text_font(s_lbl_ac_out_state, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(s_lbl_ac_out_state, UI_COLOR_GREEN, 0);
    lv_obj_align(s_lbl_ac_out_state, LV_ALIGN_RIGHT_MID, -74, 2);

    /* 2. Power Saving Mode */
    lv_obj_t *c2 = lv_obj_create(tab);
    lv_obj_add_style(c2, &s_style_card, 0);
    lv_obj_set_size(c2, 464, 68);
    lv_obj_set_pos(c2, 0, 82);

    lv_obj_t *lbl_ps_tit = lv_label_create(c2);
    lv_label_set_text(lbl_ps_tit, "綠能節能模式 (Power Saving Mode)");
    lv_obj_set_style_text_font(lbl_ps_tit, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(lbl_ps_tit, UI_COLOR_TEXT_MAIN, 0);
    lv_obj_align(lbl_ps_tit, LV_ALIGN_TOP_LEFT, 4, 4);

    lv_obj_t *lbl_ps_sub = lv_label_create(c2);
    lv_label_set_text(lbl_ps_sub, "開啟後，當負載小於 10W 時，逆變器自動進入 1.5W 待機低功耗模式。");
    lv_obj_set_style_text_font(lbl_ps_sub, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(lbl_ps_sub, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(lbl_ps_sub, LV_ALIGN_TOP_LEFT, 4, 26);

    s_sw_saving_mode = lv_switch_create(c2);
    lv_obj_set_size(s_sw_saving_mode, 54, 26);
    lv_obj_align(s_sw_saving_mode, LV_ALIGN_RIGHT_MID, -8, 2);
    lv_obj_add_event_cb(s_sw_saving_mode, sw_saving_mode_event_cb, LV_EVENT_VALUE_CHANGED, NULL);

    /* 3. Output Configuration Notice Card */
    lv_obj_t *c3 = lv_obj_create(tab);
    lv_obj_add_style(c3, &s_style_card, 0);
    lv_obj_set_size(c3, 464, 76);
    lv_obj_set_pos(c3, 0, 156);

    lv_obj_t *lbl_cfg_tit = lv_label_create(c3);
    lv_label_set_text(lbl_cfg_tit, "AC 輸出電壓 / 頻率標準參數 (NTU-1200-112US)");
    lv_obj_set_style_text_font(lbl_cfg_tit, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(lbl_cfg_tit, UI_COLOR_BLUE, 0);
    lv_obj_align(lbl_cfg_tit, LV_ALIGN_TOP_LEFT, 4, 2);

    lv_obj_t *lbl_cfg_desc = lv_label_create(c3);
    lv_label_set_text(lbl_cfg_desc, 
        "當前配置：標稱 110Vac / 60Hz (美規插座標準)\n"
        "如需切換輸出電壓 (100/110/115/120V) 或頻率 (50/60Hz)，系統將自動發送 pU 解鎖指令。");
    lv_obj_set_style_text_font(lbl_cfg_desc, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(lbl_cfg_desc, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(lbl_cfg_desc, LV_ALIGN_TOP_LEFT, 4, 22);
}

/* ============================================================================
 * Tab 4: Alarms & Logs Setup
 * ============================================================================ */
static void create_tab_alarms(lv_obj_t *tab) {
    /* 1. Real-time Alarm Banner */
    lv_obj_t *b_card = lv_obj_create(tab);
    lv_obj_add_style(b_card, &s_style_card, 0);
    lv_obj_set_size(b_card, 464, 52);
    lv_obj_set_pos(b_card, 0, 0);

    s_lbl_alarm_banner = lv_label_create(b_card);
    lv_label_set_text(s_lbl_alarm_banner, "✅ 系統目前運作良好，無任何異常警告與故障。");
    lv_obj_set_style_text_font(s_lbl_alarm_banner, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(s_lbl_alarm_banner, UI_COLOR_GREEN, 0);
    lv_obj_align(s_lbl_alarm_banner, LV_ALIGN_CENTER, 0, 0);

    /* 2. Protection Threshold Reference & History Log */
    lv_obj_t *l_card = lv_obj_create(tab);
    lv_obj_add_style(l_card, &s_style_card, 0);
    lv_obj_set_size(l_card, 464, 176);
    lv_obj_set_pos(l_card, 0, 58);

    lv_obj_t *l_tit = lv_label_create(l_card);
    lv_label_set_text(l_tit, "NTU-1200-112US 內建硬體保護門檻與安全警報清單：");
    lv_obj_set_style_text_font(l_tit, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(l_tit, UI_COLOR_TEXT_MAIN, 0);
    lv_obj_align(l_tit, LV_ALIGN_TOP_LEFT, 4, 2);

    s_list_alarm_log = lv_list_create(l_card);
    lv_obj_set_size(s_list_alarm_log, 450, 134);
    lv_obj_align(s_list_alarm_log, LV_ALIGN_BOTTOM_MID, 0, -2);
    lv_obj_set_style_bg_color(s_list_alarm_log, lv_color_hex(0x11161E), 0);
    lv_obj_set_style_border_width(s_list_alarm_log, 0, 0);

    lv_list_add_text(s_list_alarm_log, "--- 原廠規範保護設定值 ---");
    lv_list_add_btn(s_list_alarm_log, LV_SYMBOL_WARNING, "電池低壓警告 (Low Alarm): 11.0V ± 0.3V (橘色警示)");
    lv_list_add_btn(s_list_alarm_log, LV_SYMBOL_CLOSE,   "電池低壓關斷 (Low Shutdown): 10.0V ± 0.3V (紅色緊急切斷)");
    lv_list_add_btn(s_list_alarm_log, LV_SYMBOL_REFRESH, "電池低壓重啟 (Low Restart): 12.5V ± 0.3V (回復供電)");
    lv_list_add_btn(s_list_alarm_log, LV_SYMBOL_WARNING, "電池高壓警告 (High Alarm): 15.5V ± 0.3V");
    lv_list_add_btn(s_list_alarm_log, LV_SYMBOL_CLOSE,   "電池高壓關斷 (High Shutdown): 16.5V ± 0.3V");
    lv_list_add_btn(s_list_alarm_log, LV_SYMBOL_WARNING, "輸出過載警報 (Overload): 1200W (100%) ~ 1380W (3分鐘)");
}

/* ============================================================================
 * Tab 5: Settings Setup
 * ============================================================================ */
static void create_tab_settings(lv_obj_t *tab) {
    /* 1. Backlight Brightness Control */
    lv_obj_t *c1 = lv_obj_create(tab);
    lv_obj_add_style(c1, &s_style_card, 0);
    lv_obj_set_size(c1, 464, 56);
    lv_obj_set_pos(c1, 0, 0);

    lv_obj_t *lbl_b_tit = lv_label_create(c1);
    lv_label_set_text(lbl_b_tit, "螢幕背光亮度");
    lv_obj_set_style_text_font(lbl_b_tit, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(lbl_b_tit, UI_COLOR_TEXT_MAIN, 0);
    lv_obj_align(lbl_b_tit, LV_ALIGN_LEFT_MID, 4, 0);

    s_slider_backlight = lv_slider_create(c1);
    lv_slider_set_range(s_slider_backlight, 10, 100);
    lv_slider_set_value(s_slider_backlight, s_backlight_percent, LV_ANIM_OFF);
    lv_obj_set_size(s_slider_backlight, 200, 14);
    lv_obj_align(s_slider_backlight, LV_ALIGN_CENTER, 20, 0);
    lv_obj_add_event_cb(s_slider_backlight, slider_backlight_event_cb, LV_EVENT_VALUE_CHANGED, NULL);

    s_lbl_bl_val = lv_label_create(c1);
    char buf[16];
    snprintf(buf, sizeof(buf), "%d %%", s_backlight_percent);
    lv_label_set_text(s_lbl_bl_val, buf);
    lv_obj_set_style_text_font(s_lbl_bl_val, &lv_font_montserrat_12, 0);
    lv_obj_align(s_lbl_bl_val, LV_ALIGN_RIGHT_MID, -10, 0);

    /* 2. Simulation Mode & UART Diagnostics */
    lv_obj_t *c2 = lv_obj_create(tab);
    lv_obj_add_style(c2, &s_style_card, 0);
    lv_obj_set_size(c2, 464, 60);
    lv_obj_set_pos(c2, 0, 62);

    lv_obj_t *lbl_d_tit = lv_label_create(c2);
    lv_label_set_text(lbl_d_tit, "離線模擬示範模式 (Demo)");
    lv_obj_set_style_text_font(lbl_d_tit, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(lbl_d_tit, UI_COLOR_TEXT_MAIN, 0);
    lv_obj_align(lbl_d_tit, LV_ALIGN_TOP_LEFT, 4, 2);

    s_sw_demo_mode = lv_switch_create(c2);
    lv_obj_set_size(s_sw_demo_mode, 48, 24);
    lv_obj_align(s_sw_demo_mode, LV_ALIGN_RIGHT_MID, -8, -6);
    if (NTU_IsDemoMode()) lv_obj_add_state(s_sw_demo_mode, LV_STATE_CHECKED);
    lv_obj_add_event_cb(s_sw_demo_mode, sw_demo_mode_event_cb, LV_EVENT_VALUE_CHANGED, NULL);

    s_lbl_uart_stats = lv_label_create(c2);
    lv_label_set_text(s_lbl_uart_stats, "UART: 9600-8-N-1 | TX: 0 | RX: 0 | 錯誤封包: 0");
    lv_obj_set_style_text_font(s_lbl_uart_stats, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(s_lbl_uart_stats, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_align(s_lbl_uart_stats, LV_ALIGN_BOTTOM_LEFT, 4, -2);

    /* 3. Raw Packet Terminal */
    lv_obj_t *c3 = lv_obj_create(tab);
    lv_obj_add_style(c3, &s_style_card, 0);
    lv_obj_set_size(c3, 464, 106);
    lv_obj_set_pos(c3, 0, 126);

    lv_obj_t *lbl_m_tit = lv_label_create(c3);
    lv_label_set_text(lbl_m_tit, "工程 ASCII 通訊封包監視器 (Raw Monitor)");
    lv_obj_set_style_text_font(lbl_m_tit, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(lbl_m_tit, UI_COLOR_BLUE, 0);
    lv_obj_align(lbl_m_tit, LV_ALIGN_TOP_LEFT, 4, 0);

    s_ta_raw_monitor = lv_textarea_create(c3);
    lv_obj_set_size(s_ta_raw_monitor, 450, 74);
    lv_obj_align(s_ta_raw_monitor, LV_ALIGN_BOTTOM_MID, 0, -2);
    lv_obj_set_style_bg_color(s_ta_raw_monitor, lv_color_hex(0x0B0E12), 0);
    lv_obj_set_style_text_font(s_ta_raw_monitor, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(s_ta_raw_monitor, lv_color_hex(0x00E676), 0);
    lv_textarea_set_text(s_ta_raw_monitor, "TX: Q\\r\nRX: (110.0 035 035.0 012.6 038.5 110.0 060.0 162.0 000 1011000000000000000)");
}

/* ============================================================================
 * Dashboard Initialization
 * ============================================================================ */

void UI_Dashboard_Init(void) {
    init_styles();

    lv_obj_t *scr = lv_scr_act();
    lv_obj_set_style_bg_color(scr, UI_COLOR_BG, 0);

    /* Top Status Bar */
    create_header(scr);

    /* Main TabView */
    lv_obj_t *tabview = lv_tabview_create(scr, LV_DIR_BOTTOM, 40);
    lv_obj_set_size(tabview, 480, 284);
    lv_obj_set_pos(tabview, 0, 36);
    lv_obj_set_style_bg_color(tabview, UI_COLOR_BG, 0);

    /* Tab Buttons Styling */
    lv_obj_t *tab_btns = lv_tabview_get_tab_btns(tabview);
    lv_obj_set_style_bg_color(tab_btns, lv_color_hex(0x131922), 0);
    lv_obj_set_style_text_color(tab_btns, UI_COLOR_TEXT_MUTED, 0);
    lv_obj_set_style_text_font(tab_btns, &lv_font_montserrat_12, 0);
    lv_obj_set_style_border_side(tab_btns, LV_BORDER_SIDE_TOP, 0);
    lv_obj_set_style_border_color(tab_btns, UI_COLOR_CARD_BORDER, 0);
    lv_obj_set_style_border_width(tab_btns, 1, 0);

    /* Add 5 Tabs */
    lv_obj_t *tab1 = lv_tabview_add_tab(tabview, "儀表總覽");
    lv_obj_t *tab2 = lv_tabview_add_tab(tabview, "即時數據");
    lv_obj_t *tab3 = lv_tabview_add_tab(tabview, "控制操作");
    lv_obj_t *tab4 = lv_tabview_add_tab(tabview, "歷史告警");
    lv_obj_t *tab5 = lv_tabview_add_tab(tabview, "系統設定");

    create_tab_dashboard(tab1);
    create_tab_telemetry(tab2);
    create_tab_control(tab3);
    create_tab_alarms(tab4);
    create_tab_settings(tab5);
}

/* ============================================================================
 * Dashboard Dynamic Update
 * ============================================================================ */

void UI_Dashboard_Update(const NTU_DeviceState_t *state) {
    if (!state) return;

    char buf[64];

    /* 1. Header Updates */
    if (state->is_online) {
        lv_led_set_color(s_led_comm_status, UI_COLOR_GREEN);
        lv_label_set_text(s_lbl_comm_status, "連線正常");
        lv_obj_set_style_text_color(s_lbl_comm_status, UI_COLOR_GREEN, 0);
    } else {
        lv_led_set_color(s_led_comm_status, UI_COLOR_RED);
        lv_label_set_text(s_lbl_comm_status, "通訊離線");
        lv_obj_set_style_text_color(s_lbl_comm_status, UI_COLOR_RED, 0);
    }

    if (state->flags.bypass_mode_active) {
        lv_label_set_text(s_lbl_mode_badge, "[UPS 市電旁路]");
        lv_obj_set_style_text_color(s_lbl_mode_badge, UI_COLOR_BLUE, 0);
    } else if (state->flags.inv_mode_active) {
        lv_label_set_text(s_lbl_mode_badge, "[逆變器輸出中]");
        lv_obj_set_style_text_color(s_lbl_mode_badge, UI_COLOR_GREEN, 0);
    } else {
        lv_label_set_text(s_lbl_mode_badge, "[待機中 (Standby)]");
        lv_obj_set_style_text_color(s_lbl_mode_badge, UI_COLOR_ORANGE, 0);
    }

    uint32_t sec = millis() / 1000;
    snprintf(buf, sizeof(buf), "%02u:%02u:%02u", (unsigned int)(sec / 3600), (unsigned int)((sec % 3600) / 60), (unsigned int)(sec % 60));
    lv_label_set_text(s_lbl_uptime, buf);

    /* 2. Tab 1 Dashboard Updates */
    snprintf(buf, sizeof(buf), "AC 輸出: %0.0fV (%0.0fW)", state->v_ac_out, state->est_watts);
    lv_label_set_text(s_lbl_flow_ac_out, buf);

    snprintf(buf, sizeof(buf), "市電 %0.0fV", state->v_grid_ac);
    lv_label_set_text(s_lbl_flow_utility, buf);

    snprintf(buf, sizeof(buf), "電池 %0.1fV", state->v_bat);
    lv_label_set_text(s_lbl_flow_bat, buf);

    /* Battery Arc & Label */
    int bat_val_arc = (int)(state->v_bat * 10.0f);
    if (bat_val_arc < 90) bat_val_arc = 90;
    if (bat_val_arc > 170) bat_val_arc = 170;
    lv_arc_set_value(s_arc_bat, bat_val_arc);

    snprintf(buf, sizeof(buf), "%0.1f V", state->v_bat);
    lv_label_set_text(s_lbl_bat_val, buf);

    /* Color coding for battery safety thresholds */
    if (state->alarm_bat_critical) {
        lv_obj_set_style_arc_color(s_arc_bat, UI_COLOR_RED, LV_PART_INDICATOR);
        lv_label_set_text(s_lbl_bat_state, "電池低壓切斷 (<10V)");
        lv_obj_set_style_text_color(s_lbl_bat_state, UI_COLOR_RED, 0);
    } else if (state->alarm_bat_low) {
        lv_obj_set_style_arc_color(s_arc_bat, UI_COLOR_ORANGE, LV_PART_INDICATOR);
        lv_label_set_text(s_lbl_bat_state, "電池低壓警告 (<11V)");
        lv_obj_set_style_text_color(s_lbl_bat_state, UI_COLOR_ORANGE, 0);
    } else if (state->alarm_bat_high) {
        lv_obj_set_style_arc_color(s_arc_bat, UI_COLOR_RED, LV_PART_INDICATOR);
        lv_label_set_text(s_lbl_bat_state, "電池過壓警告 (>15.5V)");
        lv_obj_set_style_text_color(s_lbl_bat_state, UI_COLOR_RED, 0);
    } else {
        lv_obj_set_style_arc_color(s_arc_bat, UI_COLOR_GREEN, LV_PART_INDICATOR);
        lv_label_set_text(s_lbl_bat_state, "電池電壓 (正常)");
        lv_obj_set_style_text_color(s_lbl_bat_state, UI_COLOR_TEXT_MUTED, 0);
    }

    /* Load Arc & Label */
    int load_val = (int)state->load_percent;
    lv_arc_set_value(s_arc_load, load_val > 120 ? 120 : load_val);

    snprintf(buf, sizeof(buf), "%d %%", load_val);
    lv_label_set_text(s_lbl_load_val, buf);

    snprintf(buf, sizeof(buf), "%0.0f W", state->est_watts);
    lv_label_set_text(s_lbl_load_watts, buf);

    if (state->alarm_overload_crit) {
        lv_obj_set_style_arc_color(s_arc_load, UI_COLOR_RED, LV_PART_INDICATOR);
    } else if (state->alarm_overload_warn) {
        lv_obj_set_style_arc_color(s_arc_load, UI_COLOR_ORANGE, LV_PART_INDICATOR);
    } else {
        lv_obj_set_style_arc_color(s_arc_load, UI_COLOR_BLUE, LV_PART_INDICATOR);
    }

    /* Temp */
    snprintf(buf, sizeof(buf), "%0.1f °C", state->temp_c);
    lv_label_set_text(s_lbl_temp_val, buf);

    /* 3. Tab 2 Telemetry Updates */
    snprintf(buf, sizeof(buf), "電池電壓: %0.1f V", state->v_bat);
    lv_label_set_text(s_lbl_telem_vbat, buf);

    snprintf(buf, sizeof(buf), "輸出電壓: %0.1f V", state->v_ac_out);
    lv_label_set_text(s_lbl_telem_vac, buf);

    snprintf(buf, sizeof(buf), "市電電壓: %0.1f V", state->v_grid_ac);
    lv_label_set_text(s_lbl_telem_vgrid, buf);

    snprintf(buf, sizeof(buf), "輸出頻率: %0.1f Hz", state->freq_hz);
    lv_label_set_text(s_lbl_telem_freq, buf);

    snprintf(buf, sizeof(buf), "負載比例: %0.0f %%", state->load_percent);
    lv_label_set_text(s_lbl_telem_load, buf);

    snprintf(buf, sizeof(buf), "輸出功率: %0.0f W", state->est_watts);
    lv_label_set_text(s_lbl_telem_watts, buf);

    snprintf(buf, sizeof(buf), "機內溫度: %0.1f °C", state->temp_c);
    lv_label_set_text(s_lbl_telem_temp, buf);

    snprintf(buf, sizeof(buf), "高壓母線: %0.1f V", state->v_dc_bus);
    lv_label_set_text(s_lbl_telem_vdc, buf);

    /* Update Trend Chart */
    lv_chart_set_next_value(s_chart_trend, s_ser_bat, (lv_coord_t)(state->v_bat * 5.0f));
    lv_chart_set_next_value(s_chart_trend, s_ser_load, (lv_coord_t)state->load_percent);

    /* 4. Tab 4 Alarm Banner Update */
    if (state->alarm_comm_lost) {
        lv_label_set_text(s_lbl_alarm_banner, "❌ 警報：RS-232 通訊中斷！請檢查 RJ11 與隔離轉接模組！");
        lv_obj_set_style_text_color(s_lbl_alarm_banner, UI_COLOR_RED, 0);
    } else if (state->alarm_bat_critical) {
        lv_label_set_text(s_lbl_alarm_banner, "🚨 警告：電池電壓低於 10.0V！即將觸發低壓保護切斷！");
        lv_obj_set_style_text_color(s_lbl_alarm_banner, UI_COLOR_RED, 0);
    } else if (state->alarm_bat_low) {
        lv_label_set_text(s_lbl_alarm_banner, "⚠️ 警告：電池電壓偏低 (< 11.0V)，請儘速充電！");
        lv_obj_set_style_text_color(s_lbl_alarm_banner, UI_COLOR_ORANGE, 0);
    } else if (state->alarm_overload_crit) {
        lv_label_set_text(s_lbl_alarm_banner, "🚨 警告：負載嚴重超載 (> 115%)！即將觸發過載關斷！");
        lv_obj_set_style_text_color(s_lbl_alarm_banner, UI_COLOR_RED, 0);
    } else if (state->alarm_overload_warn) {
        lv_label_set_text(s_lbl_alarm_banner, "⚠️ 警告：負載超過 100% (1200W)，限時 3 分鐘運轉！");
        lv_obj_set_style_text_color(s_lbl_alarm_banner, UI_COLOR_ORANGE, 0);
    } else {
        lv_label_set_text(s_lbl_alarm_banner, "✅ 系統目前運作良好，無任何異常警告與故障。");
        lv_obj_set_style_text_color(s_lbl_alarm_banner, UI_COLOR_GREEN, 0);
    }

    /* 5. Tab 5 Settings Stats & Raw Monitor */
    snprintf(buf, sizeof(buf), "UART: 9600-8-N-1 | TX: %u | RX: %u | 錯誤封包: %u",
             (unsigned int)state->tx_count, (unsigned int)state->rx_count, (unsigned int)state->err_count);
    lv_label_set_text(s_lbl_uart_stats, buf);

    char mon_buf[160];
    snprintf(mon_buf, sizeof(mon_buf), "TX: %s\nRX: %s", state->last_raw_tx, state->last_raw_rx);
    lv_textarea_set_text(s_ta_raw_monitor, mon_buf);
}
