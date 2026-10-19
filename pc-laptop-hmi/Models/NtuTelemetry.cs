namespace Ntu1200Hmi.Models;

public class NtuTelemetry
{
    public double AcOutputVoltage { get; set; }
    public int LoadPercent { get; set; }
    public double LoadWatts { get; set; }
    public double BatteryVoltage { get; set; }
    public double Temperature { get; set; }
    public double GridInputVoltage { get; set; }
    public double OutputFrequency { get; set; }
    public double DcBusVoltage { get; set; }

    public bool InverterActive { get; set; }
    public bool UtilityBypass { get; set; }
    public bool GridNormal { get; set; }
    public bool SavingMode { get; set; }
    public bool Fault { get; set; }
    public bool EepromError { get; set; }

    public string RawBitString { get; set; } = "0000000000000000000";
    public string PowerPath { get; set; } = "STANDBY";
    public string BatteryStatus { get; set; } = "UNKNOWN";
    public long LatencyMs { get; set; }
    public string RawPacket { get; set; } = "";
    public DateTime Timestamp { get; set; } = DateTime.Now;

    public static NtuTelemetry? Parse(string rawPacket, long latencyMs = 0)
    {
        if (string.IsNullOrWhiteSpace(rawPacket)) return null;

        var trimmed = rawPacket.Trim().Replace("\r", "").Replace("\n", "");
        if (!trimmed.StartsWith("(") || !trimmed.EndsWith(")")) return null;

        var content = trimmed.Substring(1, trimmed.Length - 2).Trim();
        var tokens = content.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length < 10) return null;

        try
        {
            var model = new NtuTelemetry
            {
                AcOutputVoltage = double.TryParse(tokens[0], out var ac) ? ac : 0.0,
                LoadPercent = int.TryParse(tokens[1], out var lp) ? lp : 0,
                BatteryVoltage = double.TryParse(tokens[3], out var bv) ? bv : 0.0,
                Temperature = double.TryParse(tokens[4], out var temp) ? temp : 0.0,
                GridInputVoltage = double.TryParse(tokens[5], out var gv) ? gv : 0.0,
                OutputFrequency = double.TryParse(tokens[6], out var freq) ? freq : 0.0,
                DcBusVoltage = double.TryParse(tokens[7], out var db) ? db : 0.0,
                LatencyMs = latencyMs,
                RawPacket = trimmed,
                Timestamp = DateTime.Now
            };

            model.LoadWatts = Math.Round(model.LoadPercent * (1200.0 / 100.0), 1);

            var bitStr = tokens[9];
            model.RawBitString = bitStr;
            model.InverterActive = bitStr.Length > 0 && bitStr[0] == '1';
            model.UtilityBypass = bitStr.Length > 1 && bitStr[1] == '1';
            model.GridNormal = bitStr.Length > 2 && bitStr[2] == '1';
            model.SavingMode = bitStr.Length > 5 && bitStr[5] == '1';
            model.Fault = bitStr.Length > 16 && bitStr[16] == '1';
            model.EepromError = bitStr.Length > 17 && bitStr[17] == '1';

            // 電力路徑判斷
            if (model.Fault)
                model.PowerPath = "FAULT";
            else if (model.UtilityBypass)
                model.PowerPath = "UTILITY_BYPASS";
            else if (model.InverterActive)
                model.PowerPath = "INVERTER_BATTERY";
            else
                model.PowerPath = "STANDBY";

            // 電池狀態門檻判定 (明緯 NTU-1200-112US 原廠電氣規格)
            if (model.BatteryVoltage < 10.0)
                model.BatteryStatus = "LOW_SHUTDOWN";
            else if (model.BatteryVoltage < 11.0)
                model.BatteryStatus = "LOW_ALARM";
            else if (model.BatteryVoltage > 16.5)
                model.BatteryStatus = "HIGH_SHUTDOWN";
            else if (model.BatteryVoltage > 15.5)
                model.BatteryStatus = "HIGH_ALARM";
            else
                model.BatteryStatus = "NORMAL";

            return model;
        }
        catch
        {
            return null;
        }
    }
}
