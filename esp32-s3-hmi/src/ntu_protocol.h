/**
 * @file ntu_protocol.h
 * @brief MEAN WELL NTU-1200-112US Inverter Communication Protocol Driver
 * 
 * Hardware Profile:
 *   - Model: MEAN WELL NTU-1200-112US
 *   - Rated: 1200W Continuous, 2000W Peak
 *   - Input: 12Vdc (10.0V - 16.5V)
 *   - Output: 110Vac 60Hz (Pure Sine Wave) with UPS Grid Bypass
 *   - Remote Port: RJ11 (RS-232 level, 9600-8-N-1, ASCII)
 */

#ifndef NTU_PROTOCOL_H
#define NTU_PROTOCOL_H

#include <Arduino.h>
#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ============================================================================
 * Hardware & Safety Thresholds (NTU-1200-112US Factory Specifications)
 * ============================================================================ */
#define NTU_RATED_POWER_WATTS       1200.0f
#define NTU_PEAK_POWER_WATTS        2000.0f
#define NTU_OVERLOAD_3MIN_WATTS     1380.0f

#define NTU_BAT_NOMINAL_VOLT        12.0f
#define NTU_BAT_VOLT_MIN_OP         10.0f
#define NTU_BAT_VOLT_MAX_OP         16.5f

#define NTU_BAT_LOW_ALARM_VOLT      11.0f  /* Low voltage warning trigger */
#define NTU_BAT_LOW_SHUTDOWN_VOLT   10.0f  /* Low voltage shutdown trigger */
#define NTU_BAT_LOW_RESTART_VOLT    12.5f  /* Low voltage recovery/restart */

#define NTU_BAT_HIGH_ALARM_VOLT     15.5f  /* High voltage warning trigger */
#define NTU_BAT_HIGH_SHUTDOWN_VOLT  16.5f  /* High voltage shutdown trigger */

#define NTU_AC_NOMINAL_VOLT         110.0f
#define NTU_AC_NOMINAL_FREQ         60.0f

/* Timing Parameters */
#define NTU_MIN_POLL_INTERVAL_MS    500    /* Specification: Min 500ms between requests */
#define NTU_RESPONSE_TIMEOUT_MS     150    /* Manual typical <15ms; safety margin 150ms */
#define NTU_MAX_COMM_FAILS          3      /* 3 consecutive misses flag as OFFLINE */

/* ============================================================================
 * Protocol Status Flag Bitfield
 * ============================================================================ */
typedef struct {
    bool inv_mode_active;       /* b0: Inverter Mode (1: running, 0: standby/off) */
    bool bypass_mode_active;    /* b1: Bypass Mode (1: AC utility pass-through) */
    bool utility_ac_present;    /* b2: Utility AC Input detected and normal */
    bool utility_charger_en;    /* b3: Utility Charger Enabled */
    bool solar_charger_en;      /* b4: Solar Charger Enabled */
    bool power_saving_en;       /* b5: Power Saving mode active */
    bool inv_fault;             /* b16: Inverter Internal Fault */
    bool eeprom_error;          /* b17: Memory/EEPROM checksum error */
    char raw_bits[24];          /* Full raw ASCII bitstring */
} NTU_StatusFlags_t;

/* ============================================================================
 * Device Telemetry & State Structure
 * ============================================================================ */
typedef struct {
    /* Live Measurements */
    float v_ac_out;             /* Output AC Voltage (V) */
    float load_percent;         /* Load Ratio (0.0% ~ 100.0%+) */
    float load_analog;          /* Secondary/Analog Load measurement */
    float v_bat;                /* DC Battery Input Voltage (V) */
    float temp_c;               /* Internal Heat Sink Temp (°C) */
    float v_grid_ac;            /* Utility Mains Input Voltage (V) */
    float freq_hz;              /* Output Frequency (Hz) */
    float v_dc_bus;             /* Internal High Voltage DC Bus (V) */
    float est_watts;            /* Computed wattage: 1200W * load_percent / 100 */

    /* Status & Flags */
    NTU_StatusFlags_t flags;
    bool is_online;             /* Communication link health status */
    uint32_t last_seen_ms;      /* Millis timestamp of last valid frame */

    /* Safety & Warning States */
    bool alarm_bat_low;         /* Battery < 11.0V warning */
    bool alarm_bat_critical;    /* Battery < 10.0V cutoff alert */
    bool alarm_bat_high;        /* Battery > 15.5V alert */
    bool alarm_overload_warn;   /* Load > 100% (1200W) */
    bool alarm_overload_crit;   /* Load > 115% (1380W) */
    bool alarm_comm_lost;       /* UART communication offline */

    /* Diagnostics / Telemetry Counters */
    uint32_t tx_count;          /* Queries sent */
    uint32_t rx_count;          /* Valid response packets received */
    uint32_t err_count;         /* Checksum / syntax / timeout errors */
    char last_raw_rx[80];       /* For Engineering Hex/ASCII monitor */
    char last_raw_tx[32];
} NTU_DeviceState_t;

/* ============================================================================
 * Command Types
 * ============================================================================ */
typedef enum {
    NTU_CMD_QUERY_STATUS,       /* 'Q\r' Status inquiry */
    NTU_CMD_QUERY_INFO,         /* 'I\r' Device info */
    NTU_CMD_UNLOCK_PARAM,       /* 'pU\r' Unlock setting mode */
    NTU_CMD_OUTPUT_ON,          /* Turn AC output ON */
    NTU_CMD_OUTPUT_OFF,         /* Turn AC output OFF */
    NTU_CMD_SAVING_MODE_ON,     /* Power saving mode enable */
    NTU_CMD_SAVING_MODE_OFF,    /* Power saving mode disable */
    NTU_CMD_SET_AC_OUTPUT       /* Set voltage and frequency */
} NTU_CommandType_t;

typedef struct {
    NTU_CommandType_t type;
    uint16_t target_voltage;    /* e.g., 100, 110, 115, 120 */
    uint8_t target_frequency;   /* e.g., 50, 60 */
} NTU_ControlCommand_t;

/* ============================================================================
 * Function Prototypes
 * ============================================================================ */
void NTU_InitState(NTU_DeviceState_t *state);
uint8_t NTU_CalculateChecksum(const char *cmd_str, size_t len);

/* Command Frame Formatters */
size_t NTU_BuildQueryCmd(char *buffer, size_t max_len);
size_t NTU_BuildInfoCmd(char *buffer, size_t max_len);
size_t NTU_BuildUnlockCmd(char *buffer, size_t max_len);
size_t NTU_BuildOutputControlCmd(bool enable, char *buffer, size_t max_len);
size_t NTU_BuildSavingModeCmd(bool enable, char *buffer, size_t max_len);
size_t NTU_BuildVoltageFreqCmd(uint16_t voltage, uint8_t freq, char *buffer, size_t max_len);

/* Response Parser */
bool NTU_ParseStatusResponse(const char *resp, size_t len, NTU_DeviceState_t *state);
void NTU_UpdateProtectionFlags(NTU_DeviceState_t *state);

#ifdef __cplusplus
}
#endif

#endif /* NTU_PROTOCOL_H */
