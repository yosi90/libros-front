namespace WinformsRtfHarness;

internal sealed class ViewerForm : Form
{
    public ViewerForm(string leftRtf, string rightRtf)
    {
        Text = "Comparador RTF mediante RichEdit";
        Width = 1400;
        Height = 900;
        StartPosition = FormStartPosition.CenterScreen;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 2
        };
        layout.ColumnStyles.Add(new(SizeType.Percent, 50));
        layout.ColumnStyles.Add(new(SizeType.Percent, 50));
        layout.RowStyles.Add(new(SizeType.Absolute, 36));
        layout.RowStyles.Add(new(SizeType.Percent, 100));
        layout.Controls.Add(CreateLabel("Referencia RichEdit"), 0, 0);
        layout.Controls.Add(CreateLabel("Resultado web"), 1, 0);
        layout.Controls.Add(CreateEditor(leftRtf), 0, 1);
        layout.Controls.Add(CreateEditor(rightRtf), 1, 1);
        Controls.Add(layout);
    }

    private static Label CreateLabel(string text) => new()
    {
        Text = text,
        Dock = DockStyle.Fill,
        TextAlign = ContentAlignment.MiddleCenter,
        Font = new Font("Segoe UI", 9F, FontStyle.Bold)
    };

    private static RichTextBox CreateEditor(string rtf)
    {
        var editor = new RichTextBox
        {
            Dock = DockStyle.Fill,
            ReadOnly = true,
            DetectUrls = false,
            WordWrap = true
        };
        editor.Rtf = rtf;
        return editor;
    }
}
