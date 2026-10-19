namespace Ntu1200Hmi.Models;

public class PortInfo
{
    public string PortName { get; set; } = "";
    public string Description { get; set; } = "";
    public string ChipType { get; set; } = "";

    public string DisplayText => $"{PortName} - {Description} [{ChipType}]";

    public override string ToString() => DisplayText;
}
