using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;

namespace Ntu1200Hmi;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        ViewModel.OnDataRefreshed += RedrawChart;
    }

    private void BtnConnect_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.ToggleConnect();
    }

    private void BtnRefresh_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.RefreshPorts();
    }

    private void BtnSwitchMonitor_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SelectedUiMode = 0;
    }

    private void BtnSwitchEngineering_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SelectedUiMode = 1;
    }

    private void BtnTurnOnAC_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendTurnOnAC();
    }

    private void BtnTurnOffAC_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendTurnOffAC();
    }

    private void BtnEnableSaving_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendSavingMode(true);
    }

    private void BtnDisableSaving_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendSavingMode(false);
    }

    private void BtnUnlock_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendUnlock();
    }

    private void BtnSet110V60Hz_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendConfigureVoltage("110", "060");
    }

    private void BtnSet115V60Hz_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendConfigureVoltage("115", "060");
    }

    private void BtnSet120V60Hz_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendConfigureVoltage("120", "060");
    }

    private void BtnSet110V50Hz_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendConfigureVoltage("110", "050");
    }

    private void BtnQueryInfo_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendQueryDeviceInfo();
    }

    private void BtnApplyVoltage_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendApplySelectedVoltageConfig();
    }

    private void BtnQuickCmd_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string cmd)
        {
            ViewModel.SendQuickCommand(cmd);
        }
    }

    private void BtnSendCustomCmd_Click(object sender, RoutedEventArgs e)
    {
        ViewModel.SendRawCommand(TxtCustomCmd.Text);
    }

    private void TrendCanvas_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        RedrawChart();
    }

    private void RedrawChart()
    {
        if (ViewModel.SelectedUiMode != 0) return; // 僅在監控模式重繪

        TrendCanvas.Children.Clear();
        var w = TrendCanvas.ActualWidth;
        var h = TrendCanvas.ActualHeight;
        if (w < 100 || h < 50) return;

        var history = ViewModel.HistoryPoints.ToList();
        if (history.Count < 2) return;

        double padL = 40, padR = 40, padT = 20, padB = 25;
        double chartW = w - padL - padR;
        double chartH = h - padT - padB;

        // 繪製格線
        for (int i = 0; i <= 4; i++)
        {
            var y = padT + (chartH / 4) * i;
            var line = new Line
            {
                X1 = padL,
                Y1 = y,
                X2 = w - padR,
                Y2 = y,
                Stroke = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
                StrokeThickness = 1
            };
            TrendCanvas.Children.Add(line);
        }

        double stepX = chartW / (history.Count - 1);

        // 1. 電池電壓折線 (10V ~ 16.5V, 綠色)
        var polyVbat = new Polyline
        {
            Stroke = (Brush)FindResource("AccentGreen"),
            StrokeThickness = 2.2
        };

        // 2. 負載功率折線 (0W ~ 1400W, 青色)
        var polyWatts = new Polyline
        {
            Stroke = (Brush)FindResource("AccentCyan"),
            StrokeThickness = 2.2
        };

        for (int i = 0; i < history.Count; i++)
        {
            var x = padL + i * stepX;
            var (vbat, watts) = history[i];

            var clampedV = Math.Max(10.0, Math.Min(16.5, vbat));
            var yV = padT + chartH - ((clampedV - 10.0) / 6.5) * chartH;
            polyVbat.Points.Add(new Point(x, yV));

            var clampedW = Math.Max(0.0, Math.Min(1400.0, watts));
            var yW = padT + chartH - (clampedW / 1400.0) * chartH;
            polyWatts.Points.Add(new Point(x, yW));
        }

        TrendCanvas.Children.Add(polyVbat);
        TrendCanvas.Children.Add(polyWatts);
    }
}
