namespace WinformsRtfHarness;

internal sealed record CompareRequest(string Id, string LeftRtfBase64, string RightRtfBase64);

internal sealed record CompareDifference(
    string Category,
    int Start,
    int Length,
    string Left,
    string Right);

internal sealed record CompareResponse(
    string Id,
    bool Equal,
    string LeftSha256,
    string RightSha256,
    DocumentSummary? LeftSummary,
    DocumentSummary? RightSummary,
    IReadOnlyList<CompareDifference> Differences,
    string? ErrorCode = null,
    string? ErrorMessage = null)
{
    public static CompareResponse Failed(string errorCode, string errorMessage) =>
        new(string.Empty, false, string.Empty, string.Empty, null, null, [], errorCode, errorMessage);
}

internal sealed record DocumentSummary(
    int TextLength,
    int ParagraphCount,
    int CharacterRunCount,
    bool LeadingNewline);

internal sealed record DocumentSnapshot(
    string Text,
    IReadOnlyList<CharacterRun> CharacterRuns,
    IReadOnlyList<ParagraphRun> Paragraphs);

internal sealed record CharacterRun(int Start, int Length, CharacterStyle Style);

internal sealed record CharacterStyle(
    string FontFamily,
    float FontSize,
    bool Bold,
    bool Italic,
    bool Underline,
    bool Strikeout,
    int ForegroundArgb,
    int BackgroundArgb);

internal sealed record ParagraphRun(int Start, int Length, ParagraphStyle Style);

internal sealed record ParagraphStyle(
    int Alignment,
    int StartIndentTwips,
    int RightIndentTwips,
    int OffsetTwips,
    int SpaceBeforeTwips,
    int SpaceAfterTwips,
    int LineSpacingTwips,
    int LineSpacingRule);
