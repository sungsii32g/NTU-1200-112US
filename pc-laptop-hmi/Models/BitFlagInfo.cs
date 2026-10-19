namespace Ntu1200Hmi.Models;

public class BitFlagInfo
{
    public int Index { get; set; }
    public string BitLabel => $"Bit {Index}";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Cause { get; set; } = "";
    public string TroubleshootingSop { get; set; } = "";
    public bool IsActive { get; set; }
    public bool IsAlarm { get; set; }
    public string StatusText => IsActive ? (IsAlarm ? "⚠️ 異常觸發" : "⚡ 動作中") : "● 正常閒置";
    public string BadgeColor => IsActive ? (IsAlarm ? "#EF4444" : "#10B981") : "#334155";
}
