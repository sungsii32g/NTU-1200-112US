/**
 * @file ntu_comm_task.cpp
 * @brief FreeRTOS UART Communication Task Implementation
 */

#include "ntu_comm_task.h"
#include <HardwareSerial.h>
#include <math.h>

#ifndef NTU_UART_NUM
#define NTU_UART_NUM 2
#endif

static HardwareSerial SerialNTU(NTU_UART_NUM);
static SemaphoreHandle_t s_state_mutex = NULL;
static QueueHandle_t s_cmd_queue = NULL;
static TaskHandle_t s_task_handle = NULL;

static NTU_DeviceState_t s_device_state;
static bool s_demo_mode = true; /* Defaults to true so developer gets live UI immediately without inverter connected */

static uint8_t s_consecutive_fails = 0;

static void ntu_simulate_telemetry(NTU_DeviceState_t *st) {
    static float sim_phase = 0.0f;
    sim_phase += 0.08f;
    if (sim_phase > 2.0f * 3.14159f) sim_phase -= 2.0f * 3.14159f;

    st->v_ac_out = 110.0f + 0.3f * sinf(sim_phase);
    st->load_percent = 35.0f + 12.0f * sinf(sim_phase * 0.7f);
    if (st->load_percent < 5.0f) st->load_percent = 5.0f;
    st->est_watts = NTU_RATED_POWER_WATTS * (st->load_percent / 100.0f);
    st->load_analog = st->load_percent;

    st->v_bat = 12.6f + 0.4f * cosf(sim_phase * 0.5f);
    st->temp_c = 38.5f + 1.5f * sinf(sim_phase * 0.3f);
    st->v_grid_ac = 110.2f + 0.4f * cosf(sim_phase);
    st->freq_hz = 60.0f;
    st->v_dc_bus = 162.0f;

    st->flags.inv_mode_active = true;
    st->flags.bypass_mode_active = false;
    st->flags.utility_ac_present = true;
    st->flags.utility_charger_en = true;
    st->flags.solar_charger_en = false;
    st->flags.power_saving_en = false;
    st->flags.inv_fault = false;
    st->flags.eeprom_error = false;

    snprintf(st->flags.raw_bits, sizeof(st->flags.raw_bits), "1011000000000000000");

    snprintf(st->last_raw_rx, sizeof(st->last_raw_rx), 
             "(%05.1f %03.0f %04.1f %04.1f %04.1f %05.1f %04.1f %05.1f 000 %s)",
             st->v_ac_out, st->load_percent, st->load_analog, st->v_bat,
             st->temp_c, st->v_grid_ac, st->freq_hz, st->v_dc_bus, st->flags.raw_bits);

    st->is_online = true;
    st->last_seen_ms = millis();
    st->rx_count++;
    NTU_UpdateProtectionFlags(st);
}

static void ntu_uart_task(void *pvParameters) {
    char tx_buf[64];
    char rx_buf[128];
    TickType_t last_wake_time = xTaskGetTickCount();

    while (1) {
        /* 1. Check if any user command is pending in the queue */
        NTU_ControlCommand_t user_cmd;
        if (s_cmd_queue && xQueueReceive(s_cmd_queue, &user_cmd, 0) == pdTRUE) {
            size_t cmd_len = 0;

            if (user_cmd.type == NTU_CMD_SET_AC_OUTPUT) {
                /* Must send unlock parameter command first */
                cmd_len = NTU_BuildUnlockCmd(tx_buf, sizeof(tx_buf));
                SerialNTU.write((const uint8_t*)tx_buf, cmd_len);
                vTaskDelay(pdMS_TO_TICKS(25)); // Allow 25ms margin

                cmd_len = NTU_BuildVoltageFreqCmd(user_cmd.target_voltage, user_cmd.target_frequency, tx_buf, sizeof(tx_buf));
                SerialNTU.write((const uint8_t*)tx_buf, cmd_len);
            } else if (user_cmd.type == NTU_CMD_OUTPUT_ON) {
                cmd_len = NTU_BuildOutputControlCmd(true, tx_buf, sizeof(tx_buf));
                SerialNTU.write((const uint8_t*)tx_buf, cmd_len);
            } else if (user_cmd.type == NTU_CMD_OUTPUT_OFF) {
                cmd_len = NTU_BuildOutputControlCmd(false, tx_buf, sizeof(tx_buf));
                SerialNTU.write((const uint8_t*)tx_buf, cmd_len);
            } else if (user_cmd.type == NTU_CMD_SAVING_MODE_ON) {
                cmd_len = NTU_BuildSavingModeCmd(true, tx_buf, sizeof(tx_buf));
                SerialNTU.write((const uint8_t*)tx_buf, cmd_len);
            } else if (user_cmd.type == NTU_CMD_SAVING_MODE_OFF) {
                cmd_len = NTU_BuildSavingModeCmd(false, tx_buf, sizeof(tx_buf));
                SerialNTU.write((const uint8_t*)tx_buf, cmd_len);
            }

            if (xSemaphoreTake(s_state_mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                strncpy(s_device_state.last_raw_tx, tx_buf, sizeof(s_device_state.last_raw_tx) - 1);
                s_device_state.tx_count++;
                xSemaphoreGive(s_state_mutex);
            }

            /* Wait margin before resuming periodic status query */
            vTaskDelay(pdMS_TO_TICKS(30));
        }

        /* 2. Normal periodic query: 'Q\r' */
        while (SerialNTU.available()) {
            SerialNTU.read(); // Clear buffer
        }

        size_t q_len = NTU_BuildQueryCmd(tx_buf, sizeof(tx_buf));
        SerialNTU.write((const uint8_t*)tx_buf, q_len);

        if (xSemaphoreTake(s_state_mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            strncpy(s_device_state.last_raw_tx, tx_buf, sizeof(s_device_state.last_raw_tx) - 1);
            s_device_state.tx_count++;
            xSemaphoreGive(s_state_mutex);
        }

        /* 3. Wait for response with 150ms timeout */
        uint32_t start_ms = millis();
        size_t rx_idx = 0;
        bool frame_complete = false;

        while ((millis() - start_ms) < NTU_RESPONSE_TIMEOUT_MS && rx_idx < (sizeof(rx_buf) - 1)) {
            while (SerialNTU.available() && rx_idx < (sizeof(rx_buf) - 1)) {
                char c = (char)SerialNTU.read();
                rx_buf[rx_idx++] = c;
                if (c == '\r' || c == '\n' || c == ')') {
                    frame_complete = true;
                    break;
                }
            }
            if (frame_complete && rx_idx > 8) break;
            vTaskDelay(pdMS_TO_TICKS(5));
        }

        rx_buf[rx_idx] = '\0';

        bool parse_success = false;
        if (frame_complete && rx_idx > 8) {
            if (xSemaphoreTake(s_state_mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                parse_success = NTU_ParseStatusResponse(rx_buf, rx_idx, &s_device_state);
                xSemaphoreGive(s_state_mutex);
            }
        }

        if (parse_success) {
            s_consecutive_fails = 0;
        } else {
            s_consecutive_fails++;
            if (xSemaphoreTake(s_state_mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
                s_device_state.err_count++;
                if (s_consecutive_fails >= NTU_MAX_COMM_FAILS) {
                    if (s_demo_mode) {
                        /* Fallback to demo telemetry so UI remains fully interactive */
                        ntu_simulate_telemetry(&s_device_state);
                    } else {
                        s_device_state.is_online = false;
                        NTU_UpdateProtectionFlags(&s_device_state);
                    }
                }
                xSemaphoreGive(s_state_mutex);
            }
        }

        /* 4. Strictly enforce >= 500ms polling cycle */
        vTaskDelayUntil(&last_wake_time, pdMS_TO_TICKS(NTU_MIN_POLL_INTERVAL_MS));
    }
}

bool NTU_CommTask_Init(uint8_t uart_nr, int rx_pin, int tx_pin, uint32_t baud) {
    if (s_state_mutex == NULL) {
        s_state_mutex = xSemaphoreCreateMutex();
    }
    if (s_cmd_queue == NULL) {
        s_cmd_queue = xQueueCreate(8, sizeof(NTU_ControlCommand_t));
    }

    NTU_InitState(&s_device_state);

    /* Initialize SerialNTU with 9600-8-N-1 */
    SerialNTU.begin(baud, SERIAL_8N1, rx_pin, tx_pin);

    /* Create background communication task pinned to Core 0 */
    BaseType_t ret = xTaskCreatePinnedToCore(
        ntu_uart_task,
        "ntu_uart_task",
        4096,
        NULL,
        3,              /* Priority 3 */
        &s_task_handle,
        0               /* Core 0 */
    );

    return (ret == pdPASS);
}

bool NTU_GetDeviceState(NTU_DeviceState_t *out_state) {
    if (!out_state || !s_state_mutex) return false;
    if (xSemaphoreTake(s_state_mutex, pdMS_TO_TICKS(30)) == pdTRUE) {
        memcpy(out_state, &s_device_state, sizeof(NTU_DeviceState_t));
        xSemaphoreGive(s_state_mutex);
        return true;
    }
    return false;
}

bool NTU_SendCommand(const NTU_ControlCommand_t *cmd) {
    if (!cmd || !s_cmd_queue) return false;
    return (xQueueSend(s_cmd_queue, cmd, pdMS_TO_TICKS(50)) == pdTRUE);
}

void NTU_SetDemoMode(bool enable) {
    s_demo_mode = enable;
}

bool NTU_IsDemoMode(void) {
    return s_demo_mode;
}
