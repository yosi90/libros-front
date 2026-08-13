using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace WinformsRtfHarness;

internal sealed class RtfComparer : IDisposable
{
    private readonly RichTextBox _left = CreateRichTextBox();
    private readonly RichTextBox _right = CreateRichTextBox();

    public CompareResponse Compare(CompareRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
            throw new InvalidDataException("Falta el identificador opaco.");

        var leftRtf = DecodeRtf(request.LeftRtfBase64);
        var rightRtf = DecodeRtf(request.RightRtfBase64);
        var leftHash = Hash(leftRtf);
        var rightHash = Hash(rightRtf);

        DocumentSnapshot left;
        DocumentSnapshot right;
        try
        {
            left = Capture(_left, leftRtf);
            right = Capture(_right, rightRtf);
        }
        catch (ArgumentException)
        {
            return new(request.Id, false, leftHash, rightHash, null, null, [], "invalid-rtf", "RichEdit rechazo uno de los documentos RTF.");
        }

        var differences = CompareSnapshots(left, right);
        return new(request.Id, differences.Count == 0, leftHash, rightHash, Summarize(left), Summarize(right), differences);
    }

    public void Dispose()
    {
        _left.Dispose();
        _right.Dispose();
    }

    private static RichTextBox CreateRichTextBox()
    {
        var control = new RichTextBox
        {
            DetectUrls = false,
            Multiline = true,
            WordWrap = false
        };
        _ = control.Handle;
        return control;
    }

    private static string DecodeRtf(string encoded)
    {
        if (string.IsNullOrWhiteSpace(encoded))
            throw new InvalidDataException("Falta un RTF codificado.");
        return Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
    }

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static DocumentSummary Summarize(DocumentSnapshot snapshot) => new(
        snapshot.Text.Length,
        snapshot.Paragraphs.Count,
        snapshot.CharacterRuns.Count,
        snapshot.Text.StartsWith('\r') || snapshot.Text.StartsWith('\n'));

    private static DocumentSnapshot Capture(RichTextBox control, string rtf)
    {
        control.Clear();
        control.Rtf = rtf;
        var text = control.Text;
        return new(text, CaptureCharacterRuns(control, text), CaptureParagraphs(control, text));
    }

    private static IReadOnlyList<CharacterRun> CaptureCharacterRuns(RichTextBox control, string text)
    {
        var runs = new List<CharacterRun>();
        CharacterStyle? active = null;
        var runStart = 0;
        var runLength = 0;

        void FinishRun()
        {
            if (active is not null && runLength > 0)
                runs.Add(new(runStart, runLength, active));
            active = null;
            runLength = 0;
        }

        for (var index = 0; index < text.Length; index++)
        {
            if (text[index] is '\r' or '\n')
            {
                FinishRun();
                continue;
            }

            control.Select(index, 1);
            var font = control.SelectionFont ?? control.Font;
            var style = new CharacterStyle(
                NormalizeFont(font.FontFamily.Name),
                MathF.Round(font.SizeInPoints, 3),
                font.Bold,
                font.Italic,
                font.Underline,
                font.Strikeout,
                control.SelectionColor.ToArgb(),
                control.SelectionBackColor.ToArgb());

            if (active is not null && active == style && runStart + runLength == index)
            {
                runLength++;
                continue;
            }

            FinishRun();
            active = style;
            runStart = index;
            runLength = 1;
        }

        FinishRun();
        return runs;
    }

    private static IReadOnlyList<ParagraphRun> CaptureParagraphs(RichTextBox control, string text)
    {
        var paragraphs = new List<ParagraphRun>();
        var start = 0;
        while (start <= text.Length)
        {
            var newline = text.IndexOf('\n', start);
            var end = newline >= 0 ? newline : text.Length;
            control.Select(Math.Min(start, text.Length), 0);
            paragraphs.Add(new(start, end - start, NativeMethods.GetParagraphStyle(control.Handle)));
            if (newline < 0)
                break;
            start = newline + 1;
        }
        return paragraphs;
    }

    private static List<CompareDifference> CompareSnapshots(DocumentSnapshot left, DocumentSnapshot right)
    {
        var differences = new List<CompareDifference>();
        if (!string.Equals(left.Text, right.Text, StringComparison.Ordinal))
        {
            var first = FirstDifference(left.Text, right.Text);
            differences.Add(new("text", first, 1, DescribeText(left.Text), DescribeText(right.Text)));
        }

        CompareRuns(left.CharacterRuns, right.CharacterRuns, differences);
        CompareParagraphs(left.Paragraphs, right.Paragraphs, differences);
        return differences;
    }

    private static void CompareRuns(IReadOnlyList<CharacterRun> left, IReadOnlyList<CharacterRun> right, List<CompareDifference> differences)
    {
        if (left.Count != right.Count)
            differences.Add(new("character-run-count", 0, 0, left.Count.ToString(), right.Count.ToString()));

        for (var index = 0; index < Math.Min(left.Count, right.Count); index++)
        {
            var lhs = left[index];
            var rhs = right[index];
            if (lhs.Start != rhs.Start || lhs.Length != rhs.Length)
                differences.Add(new("character-run-range", Math.Min(lhs.Start, rhs.Start), Math.Max(lhs.Length, rhs.Length), $"{lhs.Start}:{lhs.Length}", $"{rhs.Start}:{rhs.Length}"));
            if (lhs.Style != rhs.Style)
                differences.Add(new("character-style", Math.Min(lhs.Start, rhs.Start), Math.Max(lhs.Length, rhs.Length), Describe(lhs.Style), Describe(rhs.Style)));
        }
    }

    private static void CompareParagraphs(IReadOnlyList<ParagraphRun> left, IReadOnlyList<ParagraphRun> right, List<CompareDifference> differences)
    {
        if (left.Count != right.Count)
            differences.Add(new("paragraph-count", 0, 0, left.Count.ToString(), right.Count.ToString()));

        for (var index = 0; index < Math.Min(left.Count, right.Count); index++)
        {
            var lhs = left[index];
            var rhs = right[index];
            if (lhs.Start != rhs.Start || lhs.Length != rhs.Length)
                differences.Add(new("paragraph-range", Math.Min(lhs.Start, rhs.Start), Math.Max(lhs.Length, rhs.Length), $"{lhs.Start}:{lhs.Length}", $"{rhs.Start}:{rhs.Length}"));
            if (lhs.Style != rhs.Style)
                differences.Add(new("paragraph-style", Math.Min(lhs.Start, rhs.Start), Math.Max(lhs.Length, rhs.Length), Describe(lhs.Style), Describe(rhs.Style)));
        }
    }

    private static int FirstDifference(string left, string right)
    {
        var length = Math.Min(left.Length, right.Length);
        for (var index = 0; index < length; index++)
            if (left[index] != right[index])
                return index;
        return length;
    }

    private static string DescribeText(string text) => $"length={text.Length};sha256={Hash(text)}";

    private static string Describe(CharacterStyle style) =>
        $"font={style.FontFamily};size={style.FontSize};b={style.Bold};i={style.Italic};u={style.Underline};s={style.Strikeout};fg={style.ForegroundArgb:X8};bg={style.BackgroundArgb:X8}";

    private static string Describe(ParagraphStyle style) =>
        $"align={style.Alignment};li={style.StartIndentTwips};ri={style.RightIndentTwips};fi={style.OffsetTwips};sb={style.SpaceBeforeTwips};sa={style.SpaceAfterTwips};sl={style.LineSpacingTwips};rule={style.LineSpacingRule}";

    private static string NormalizeFont(string value) => value.Trim().ToUpperInvariant();
}

internal static class NativeMethods
{
    private const int EmGetParaFormat = 0x043D;

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern IntPtr SendMessage(IntPtr hWnd, int message, IntPtr wParam, ref ParaFormat2 format);

    public static ParagraphStyle GetParagraphStyle(IntPtr handle)
    {
        var format = ParaFormat2.Create();
        _ = SendMessage(handle, EmGetParaFormat, IntPtr.Zero, ref format);
        return new(
            format.Alignment,
            format.StartIndent,
            format.RightIndent,
            format.Offset,
            format.SpaceBefore,
            format.SpaceAfter,
            format.LineSpacing,
            format.LineSpacingRule);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ParaFormat2
    {
        public uint Size;
        public uint Mask;
        public ushort Numbering;
        public ushort Effects;
        public int StartIndent;
        public int RightIndent;
        public int Offset;
        public ushort Alignment;
        public short TabCount;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 32)]
        public int[] Tabs;
        public int SpaceBefore;
        public int SpaceAfter;
        public int LineSpacing;
        public short Style;
        public byte LineSpacingRule;
        public byte OutlineLevel;
        public ushort ShadingWeight;
        public ushort ShadingStyle;
        public ushort NumberingStart;
        public ushort NumberingStyle;
        public ushort NumberingTab;
        public ushort BorderSpace;
        public ushort BorderWidth;
        public ushort Borders;

        public static ParaFormat2 Create() => new()
        {
            Size = (uint)Marshal.SizeOf<ParaFormat2>(),
            Tabs = new int[32]
        };
    }
}
