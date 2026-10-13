/**
 * @file ntu_comm_task.h
 * @brief FreeRTOS UART Communication Task & Thread-Safe Access for MEAN WELL Inverter
 */

#ifndef NTU_COMM_TASK_H
#define NTU_COMM_TASK_H

#include <Arduino.h>
#include "ntu_protocol.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>
#include <freertos/queue.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Initialize hardware UART and FreeRTOS communication task */
bool NTU_CommTask_Init(uint8_t uart_nr, int rx_pin, int tx_pin, uint32_t baud);

/* Thread-safe retrieval of latest telemetry snapshot */
bool NTU_GetDeviceState(NTU_DeviceState_t *out_state);

/* Thread-safe queueing of user control commands */
bool NTU_SendCommand(const NTU_ControlCommand_t *cmd);

/* Enable or disable internal bench demo simulation (useful when testing without inverter) */
void NTU_SetDemoMode(bool enable);
bool NTU_IsDemoMode(void);

#ifdef __cplusplus
}
#endif

#endif /* NTU_COMM_TASK_H */
