/**
 * @file ui_dashboard.h
 * @brief LVGL 8.3 GUI for MEAN WELL NTU-1200-112US HMI System
 */

#ifndef UI_DASHBOARD_H
#define UI_DASHBOARD_H

#include <lvgl.h>
#include "ntu_protocol.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Initialize the complete UI layout, styles, and tabs */
void UI_Dashboard_Init(void);

/* Periodic UI update callback (called every 100~200ms from GUI task) */
void UI_Dashboard_Update(const NTU_DeviceState_t *state);

/* Backlight brightness setter (0 ~ 100%) */
void UI_SetBacklight(uint8_t percent);
uint8_t UI_GetBacklight(void);

#ifdef __cplusplus
}
#endif

#endif /* UI_DASHBOARD_H */
