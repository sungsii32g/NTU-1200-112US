/**
 * @file ntu_protocol.cpp
 * @brief MEAN WELL NTU-1200-112US Protocol Implementation
 */

#include "ntu_protocol.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>

void NTU_InitState(NTU_DeviceState_t *state) {
    if (!state) return;
    memset(state, 0, sizeof(NTU_DeviceState_t));
    state->v_ac_out = 0.0f;
    state->load_percent = 0.0f;
    state->load_analog = 0.0f;
    state->v_bat = 0.0f;
    state->temp_c = 0.0f;
    state->v_grid_ac = 0.0f;
    state->freq_hz = 0.0f;
    state->v_dc_bus = 0.0f;
    state->est_watts = 0.0f;
    state->is_online = false;
    state->last_seen_ms = 0;
    
    strcpy(state->last_raw_tx, "None");
    strcpy(state->last_raw_rx, "None");
    memset(state->flags.raw_bits, '0', sizeof(state->flags.raw_bits));
    state->flags.raw_bits[sizeof(state->flags.raw_bits) - 1] = '\0';
}

/**
 * @brief Calculate MEAN WELL 2-digit uppercase HEX Checksum
 * Sum of byte values modulo 256.
 */
uint8_t NTU_CalculateChecksum(const char *cmd_str, size_t len) {
    if (!cmd_str) return 0;
    uint32_t sum = 0;
    for (size_t i = 0; i < len; i++) {
        sum += (uint8_t)cmd_str[i];
    }
    return (uint8_t)(sum & 0xFF);
}

/* ============================================================================
 * Command Frame Builders
 * ============================================================================ */

size_t NTU_BuildQueryCmd(char *buffer, size_t max_len) {
    if (!buffer || max_len < 3) return 0;
    return snprintf(buffer, max_len, "Q\r");
}

size_t NTU_BuildInfoCmd(char *buffer, size_t max_len) {
    if (!buffer || max_len < 3) return 0;
    return snprintf(buffer, max_len, "I\r");
}

size_t NTU_BuildUnlockCmd(char *buffer, size_t max_len) {
    if (!buffer || max_len < 4) return 0;
    return snprintf(buffer, max_len, "pU\r");
}

size_t NTU_BuildOutputControlCmd(bool enable, char *buffer, size_t max_len) {
    if (!buffer || max_len < 18) return 0;
    /* 依據明緯官方手冊第 5.4 節第 49 頁標準 17 位元組幀格式：
     * Remote ON:  "C010000000000000\r"
     * Remote OFF: "C100000000000000\r" */
    const char *cmd = enable ? "C010000000000000\r" : "C100000000000000\r";
    size_t len = strlen(cmd);
    if (len >= max_len) return 0;
    memcpy(buffer, cmd, len + 1);
    return len;
}

size_t NTU_BuildSavingModeCmd(bool enable, char *buffer, size_t max_len) {
    if (!buffer || max_len < 8) return 0;
    char temp[16];
    int len = snprintf(temp, sizeof(temp), "W %d ", enable ? 1 : 0);
    uint8_t cs = NTU_CalculateChecksum(temp, len);
    return snprintf(buffer, max_len, "%s%02X\r", temp, cs);
}

size_t NTU_BuildVoltageFreqCmd(uint16_t voltage, uint8_t freq, char *buffer, size_t max_len) {
    if (!buffer || max_len < 12) return 0;
    /* 依據明緯官方手冊第 5.4 節第 21, 28, 40 頁標準 11 位元組幀格式 (含 2-Byte Checksum)：
     * Format: V WWW FFF [CS_H][CS_L]\r */
    char payload[16];
    int p_len = snprintf(payload, sizeof(payload), "V %03u %03u ", (unsigned int)voltage, (unsigned int)freq);
    uint16_t sum = 0;
    for (int i = 0; i < p_len; i++) {
        sum += (uint8_t)payload[i];
    }
    memcpy(buffer, payload, p_len);
    buffer[8] = (char)((sum >> 8) & 0xFF);
    buffer[9] = (char)(sum & 0xFF);
    buffer[10] = '\r';
    buffer[11] = '\0';
    return 11;
}

/* ============================================================================
 * Protocol Response Parser
 * Expected format: (VVV QQQ SS.S BBB TT.T MMM RR.R DDD PPP b0b1b2...b18)\r
 * ============================================================================ */

bool NTU_ParseStatusResponse(const char *resp, size_t len, NTU_DeviceState_t *state) {
    if (!resp || len < 15 || !state) return false;

    /* Find start '(' */
    const char *start = strchr(resp, '(');
    if (!start) return false;
    start++; // skip '('

    /* Find end ')' or '\r' or '\n' */
    const char *end = strchr(start, ')');
    size_t payload_len = 0;
    if (end) {
        payload_len = end - start;
    } else {
        const char *cr = strchr(start, '\r');
        if (!cr) cr = strchr(start, '\n');
        if (cr) payload_len = cr - start;
        else payload_len = strlen(start);
    }

    if (payload_len < 10 || payload_len > 120) return false;

    char work[128];
    if (payload_len >= sizeof(work)) payload_len = sizeof(work) - 1;
    strncpy(work, start, payload_len);
    work[payload_len] = '\0';

    /* Tokenize payload by whitespace */
    char *tokens[16];
    int token_count = 0;
    char *p = work;

    while (*p && token_count < 16) {
        while (*p && isspace((unsigned char)*p)) p++;
        if (!*p) break;
        tokens[token_count++] = p;
        while (*p && !isspace((unsigned char)*p)) p++;
        if (*p) {
            *p = '\0';
            p++;
        }
    }

    /* We expect at least 6 tokens, ideally 10 tokens */
    if (token_count < 4) return false;

    // Token 0: V_ac_out
    state->v_ac_out = strtof(tokens[0], NULL);

    // Token 1: load_percent
    if (token_count > 1) {
        state->load_percent = strtof(tokens[1], NULL);
        state->est_watts = NTU_RATED_POWER_WATTS * (state->load_percent / 100.0f);
    }

    // 依據明緯官方 NTS/NTU 手冊第 5.4 節第 37/48 頁標準：
    // Token 0: VVV (交流輸出電壓)
    // Token 1: QQQ (數位負載%)
    // Token 2: SS.S (電池電壓)
    // Token 3: BBB (電池容量%)
    // Token 8: PPP (類比負載%)
    // 雙模相容：若 Token 2 包含小數點則為標準電池電壓，否則回退相容舊格式
    if (token_count > 3) {
        if (strchr(tokens[2], '.') != NULL) {
            state->v_bat = strtof(tokens[2], NULL);
            state->battery_capacity = strtof(tokens[3], NULL);
        } else {
            state->v_bat = strtof(tokens[3], NULL);
            state->load_analog = strtof(tokens[2], NULL);
        }
    } else if (token_count > 2) {
        state->v_bat = strtof(tokens[2], NULL);
    }

    if (token_count > 8) {
        state->load_analog = strtof(tokens[8], NULL);
    }

    // Token 4: temp_c (Heatsink Temperature)
    if (token_count > 4) {
        state->temp_c = strtof(tokens[4], NULL);
    }

    // Token 5: v_grid_ac (Utility Grid Voltage)
    if (token_count > 5) {
        state->v_grid_ac = strtof(tokens[5], NULL);
    }

    // Token 6: freq_hz (AC Output Frequency)
    if (token_count > 6) {
        state->freq_hz = strtof(tokens[6], NULL);
    }

    // Token 7: v_dc_bus
    if (token_count > 7) {
        state->v_dc_bus = strtof(tokens[7], NULL);
    }

    // Check last token for bitfield if length >= 3
    if (token_count >= 8) {
        char *bit_token = tokens[token_count - 1];
        size_t b_len = strlen(bit_token);
        if (b_len >= 3) {
            // Check if characters are binary '0' / '1'
            bool is_bits = true;
            for (size_t i = 0; i < b_len && i < 20; i++) {
                if (bit_token[i] != '0' && bit_token[i] != '1') {
                    is_bits = false;
                    break;
                }
            }
            if (is_bits) {
                strncpy(state->flags.raw_bits, bit_token, sizeof(state->flags.raw_bits) - 1);
                state->flags.raw_bits[sizeof(state->flags.raw_bits) - 1] = '\0';
                
                state->flags.inv_mode_active    = (bit_token[0] == '1');
                state->flags.bypass_mode_active = (b_len > 1 && bit_token[1] == '1');
                state->flags.utility_ac_present = (b_len > 2 && bit_token[2] == '1');
                state->flags.utility_charger_en = (b_len > 3 && bit_token[3] == '1');
                state->flags.solar_charger_en   = (b_len > 4 && bit_token[4] == '1');
                state->flags.power_saving_en    = (b_len > 5 && bit_token[5] == '1');
                state->flags.inv_fault          = (b_len > 16 && bit_token[16] == '1');
                state->flags.eeprom_error       = (b_len > 17 && bit_token[17] == '1');
            }
        }
    }

    /* Save last raw response string for diagnostic display */
    strncpy(state->last_raw_rx, resp, sizeof(state->last_raw_rx) - 1);
    state->last_raw_rx[sizeof(state->last_raw_rx) - 1] = '\0';

    /* Update timestamps & counters */
    state->last_seen_ms = millis();
    state->is_online = true;
    state->rx_count++;

    /* Run safety threshold checks */
    NTU_UpdateProtectionFlags(state);

    return true;
}

/**
 * @brief Evaluate safety thresholds according to NTU-1200-112US factory specs
 */
void NTU_UpdateProtectionFlags(NTU_DeviceState_t *state) {
    if (!state) return;

    if (!state->is_online) {
        state->alarm_comm_lost = true;
        return;
    } else {
        state->alarm_comm_lost = false;
    }

    /* DC Battery Thresholds */
    state->alarm_bat_critical = (state->v_bat > 0.5f && state->v_bat < NTU_BAT_LOW_SHUTDOWN_VOLT);
    state->alarm_bat_low      = (state->v_bat > 0.5f && state->v_bat < NTU_BAT_LOW_ALARM_VOLT && !state->alarm_bat_critical);
    state->alarm_bat_high     = (state->v_bat > NTU_BAT_HIGH_ALARM_VOLT);

    /* Output Load Thresholds */
    state->alarm_overload_crit = (state->load_percent > 115.0f);
    state->alarm_overload_warn = (state->load_percent > 100.0f && !state->alarm_overload_crit);
}
