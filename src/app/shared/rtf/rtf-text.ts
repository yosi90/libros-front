const DEFAULT_FONT = 'Microsoft Sans Serif';
const DEFAULT_FONT_SIZE_HALF_POINTS = 24;
export const NARRATIVE_KEYWORD_COLOR = '#F5DEB3';

type ParagraphAlignment = 'left' | 'center' | 'right' | 'justify';

interface RtfCharacterStyle {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    fontIndex: number;
    fontSize: number;
    colorIndex: number;
    highlightIndex: number;
}

interface RtfParagraphStyle {
    alignment: ParagraphAlignment;
    leftIndent: number;
    rightIndent: number;
    firstLineIndent: number;
    spaceBefore: number;
    spaceAfter: number;
    lineSpacing: number;
    lineSpacingMultiple: boolean;
}

interface RtfParserState extends RtfCharacterStyle {
    paragraph: RtfParagraphStyle;
    unicodeFallbackLength: number;
}

interface RtfRun {
    text: string;
    style: RtfCharacterStyle;
}

interface RtfParagraph {
    style: RtfParagraphStyle;
    runs: RtfRun[];
}

interface RtfDocument {
    fonts: Map<number, string>;
    colors: Map<number, string>;
    paragraphs: RtfParagraph[];
}

interface HtmlCharacterStyle {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    fontFamily: string;
    fontSize: number;
    color: string | null;
    highlight: string | null;
}

const DEFAULT_PARAGRAPH_STYLE: RtfParagraphStyle = {
    alignment: 'left',
    leftIndent: 0,
    rightIndent: 0,
    firstLineIndent: 0,
    spaceBefore: 0,
    spaceAfter: 0,
    lineSpacing: 0,
    lineSpacingMultiple: false
};

const CP1252_SPECIAL: Record<number, number> = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
    0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6,
    0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
    0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
    0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
    0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178
};
const UNICODE_TO_CP1252 = new Map<number, number>(
    Object.entries(CP1252_SPECIAL).map(([byte, codePoint]) => [codePoint, Number(byte)])
);

const IGNORED_DESTINATIONS = new Set([
    'fonttbl', 'colortbl', 'stylesheet', 'generator', 'info', 'pict', 'object',
    'filetbl', 'listtable', 'listoverridetable', 'revtbl', 'rsidtbl', 'xmlnstbl',
    'themedata', 'colorschememapping', 'datastore', 'latentstyles', 'field', 'fldinst',
    'shp', 'shppict', 'nonshppict', 'header', 'footer', 'footnote', 'annotation'
]);
const CONTENT_GROUP_CONTROLS = new Set([
    'b', 'i', 'ul', 'ulnone', 'strike', 'f', 'fs', 'cf', 'highlight', 'plain',
    'pard', 'ql', 'qc', 'qr', 'qj', 'li', 'ri', 'fi', 'sb', 'sa', 'sl', 'slmult',
    'u', 'uc', 'ltrch', 'rtlch', 'loch', 'hich', 'dbch'
]);

export function plainTextToRtf(value: string): string {
    const body = escapeRtfText(value).replace(/\r?\n/g, '\\par ');
    return buildRtfDocument(body, [DEFAULT_FONT], []);
}

export function rtfToPlainText(value: string): string {
    return htmlToText(rtfToHtml(value)).trim();
}

export function rtfToHtml(value: string): string {
    if (!value.trim().startsWith('{\\rtf'))
        return textToHtml(value);

    const documentModel = parseRtfDocument(value);
    return documentModel.paragraphs.map(paragraph => paragraphToHtml(paragraph, documentModel)).join('');
}

export function htmlToRtf(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = trimEditorHtmlEdges(sanitizeEditorHtml(value));

    const fonts = collectHtmlFonts(container);
    const colors = collectHtmlColors(container);
    const fontIndexes = new Map(fonts.map((font, index) => [normalizeFontName(font), index]));
    const colorIndexes = new Map(colors.map((color, index) => [color, index + 1]));
    const defaultStyle = createDefaultHtmlStyle();
    const body = serializeEditorChildren(container, defaultStyle, fontIndexes, colorIndexes)
        .replace(/(?:\\par\s*)+$/g, '');

    return buildRtfDocument(body, fonts, colors);
}

function parseRtfDocument(value: string): RtfDocument {
    const fonts = parseFontTable(value);
    const colors = parseColorTable(value);
    const paragraphs: RtfParagraph[] = [];
    const state = createDefaultParserState();
    let current: RtfParagraph = createParagraph(state.paragraph);
    let contentStarted = false;

    const appendText = (text: string, activeState: RtfParserState): void => {
        if (!text)
            return;
        if (!contentStarted && !text.trim())
            return;
        contentStarted = true;
        const style = copyCharacterStyle(activeState);
        const previous = current.runs[current.runs.length - 1];
        if (previous && sameCharacterStyle(previous.style, style))
            previous.text += text;
        else
            current.runs.push({ text, style });
    };

    const finishParagraph = (activeState: RtfParserState): void => {
        contentStarted = true;
        paragraphs.push(current);
        current = createParagraph(activeState.paragraph);
    };

    const parseRange = (start: number, end: number, activeState: RtfParserState): void => {
        let index = start;
        while (index < end) {
            const char = value[index];
            if (char === '{') {
                const groupEnd = findGroupEnd(value, index);
                if (groupEnd === -1 || groupEnd > end) {
                    index++;
                    continue;
                }
                const destination = getGroupDestination(value, index + 1, groupEnd);
                const unknownDestination = !!destination.word && !CONTENT_GROUP_CONTROLS.has(destination.word)
                    && !IGNORED_DESTINATIONS.has(destination.word);
                if (!destination.ignorable && !IGNORED_DESTINATIONS.has(destination.word) && !unknownDestination)
                    parseRange(destination.contentStart, groupEnd, cloneParserState(activeState));
                index = groupEnd + 1;
                continue;
            }
            if (char === '}') {
                index++;
                continue;
            }
            if (char === '\r' || char === '\n' || char === '\t') {
                index++;
                continue;
            }
            if (char !== '\\') {
                appendText(char, activeState);
                index++;
                continue;
            }

            const token = readControlToken(value, index, end);
            index = token.nextIndex;
            if (token.kind === 'text') {
                appendText(token.text, activeState);
                continue;
            }
            if (token.kind === 'hex') {
                appendText(decodeCp1252(token.byte), activeState);
                continue;
            }
            if (token.kind === 'symbol') {
                if (token.symbol === '~')
                    appendText('\u00A0', activeState);
                else if (token.symbol === '_')
                    appendText('\u2011', activeState);
                continue;
            }

            const word = token.word;
            const arg = token.arg;
            switch (word) {
                case 'rtf':
                case 'ansi':
                case 'ansicpg':
                case 'deff':
                case 'deflang':
                case 'viewkind':
                case 'nouicompat':
                    break;
                case 'uc':
                    activeState.unicodeFallbackLength = Math.max(0, arg ?? 1);
                    break;
                case 'u': {
                    if (arg !== null)
                        appendText(String.fromCharCode(arg < 0 ? arg + 65536 : arg), activeState);
                    index = skipUnicodeFallback(value, index, end, activeState.unicodeFallbackLength);
                    break;
                }
                case 'pard':
                    activeState.paragraph = { ...DEFAULT_PARAGRAPH_STYLE };
                    current.style = { ...activeState.paragraph };
                    contentStarted = true;
                    break;
                case 'plain': {
                    const defaults = createDefaultParserState();
                    Object.assign(activeState, copyCharacterStyle(defaults));
                    break;
                }
                case 'par':
                    finishParagraph(activeState);
                    break;
                case 'line':
                    appendText('\n', activeState);
                    break;
                case 'tab':
                    appendText('\t', activeState);
                    break;
                case 'b': activeState.bold = arg !== 0; break;
                case 'i': activeState.italic = arg !== 0; break;
                case 'ul': activeState.underline = arg !== 0; break;
                case 'ulnone': activeState.underline = false; break;
                case 'strike': activeState.strike = arg !== 0; break;
                case 'f': if (arg !== null) activeState.fontIndex = arg; break;
                case 'fs': if (arg !== null && arg > 0) activeState.fontSize = arg; break;
                case 'cf': if (arg !== null) activeState.colorIndex = arg; break;
                case 'highlight': if (arg !== null) activeState.highlightIndex = arg; break;
                case 'ql': setParagraphAlignment(activeState, current, 'left'); break;
                case 'qc': setParagraphAlignment(activeState, current, 'center'); break;
                case 'qr': setParagraphAlignment(activeState, current, 'right'); break;
                case 'qj': setParagraphAlignment(activeState, current, 'justify'); break;
                case 'li': setParagraphNumber(activeState, current, 'leftIndent', arg); break;
                case 'ri': setParagraphNumber(activeState, current, 'rightIndent', arg); break;
                case 'fi': setParagraphNumber(activeState, current, 'firstLineIndent', arg); break;
                case 'sb': setParagraphNumber(activeState, current, 'spaceBefore', arg); break;
                case 'sa': setParagraphNumber(activeState, current, 'spaceAfter', arg); break;
                case 'sl': setParagraphNumber(activeState, current, 'lineSpacing', arg); break;
                case 'slmult':
                    activeState.paragraph.lineSpacingMultiple = arg === 1;
                    current.style.lineSpacingMultiple = activeState.paragraph.lineSpacingMultiple;
                    break;
            }
        }
    };

    const rootStart = value.indexOf('{') + 1;
    const rootEnd = findGroupEnd(value, Math.max(0, rootStart - 1));
    parseRange(rootStart, rootEnd === -1 ? value.length : rootEnd, state);
    if (current.runs.length || paragraphs.length === 0)
        paragraphs.push(current);

    return { fonts, colors, paragraphs };
}

function createDefaultParserState(): RtfParserState {
    return {
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        fontIndex: 0,
        fontSize: DEFAULT_FONT_SIZE_HALF_POINTS,
        colorIndex: 0,
        highlightIndex: 0,
        paragraph: { ...DEFAULT_PARAGRAPH_STYLE },
        unicodeFallbackLength: 1
    };
}

function cloneParserState(state: RtfParserState): RtfParserState {
    return { ...state, paragraph: { ...state.paragraph } };
}

function createParagraph(style: RtfParagraphStyle): RtfParagraph {
    return { style: { ...style }, runs: [] };
}

function copyCharacterStyle(style: RtfCharacterStyle): RtfCharacterStyle {
    return {
        bold: style.bold,
        italic: style.italic,
        underline: style.underline,
        strike: style.strike,
        fontIndex: style.fontIndex,
        fontSize: style.fontSize,
        colorIndex: style.colorIndex,
        highlightIndex: style.highlightIndex
    };
}

function sameCharacterStyle(a: RtfCharacterStyle, b: RtfCharacterStyle): boolean {
    return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline
        && a.strike === b.strike && a.fontIndex === b.fontIndex && a.fontSize === b.fontSize
        && a.colorIndex === b.colorIndex && a.highlightIndex === b.highlightIndex;
}

function setParagraphAlignment(state: RtfParserState, paragraph: RtfParagraph, alignment: ParagraphAlignment): void {
    state.paragraph.alignment = alignment;
    paragraph.style.alignment = alignment;
}

function setParagraphNumber(state: RtfParserState, paragraph: RtfParagraph, key: keyof RtfParagraphStyle, value: number | null): void {
    if (value === null)
        return;
    (state.paragraph[key] as number) = value;
    (paragraph.style[key] as number) = value;
}

function paragraphToHtml(paragraph: RtfParagraph, documentModel: RtfDocument): string {
    const attributes = paragraphStyleToHtmlAttributes(paragraph.style, paragraph.runs.length === 0);
    const content = paragraph.runs.length
        ? paragraph.runs.map(run => runToHtml(run, documentModel)).join('')
        : '<br>';
    return `<p${attributes}>${content}</p>`;
}

function paragraphStyleToHtmlAttributes(style: RtfParagraphStyle, preserveEmpty: boolean): string {
    const css: string[] = [];
    if (style.alignment !== 'left') css.push(`text-align:${style.alignment}`);
    if (style.leftIndent) css.push(`margin-left:${twipsToPoints(style.leftIndent)}pt`);
    if (style.rightIndent) css.push(`margin-right:${twipsToPoints(style.rightIndent)}pt`);
    if (style.firstLineIndent) css.push(`text-indent:${twipsToPoints(style.firstLineIndent)}pt`);
    if (style.spaceBefore) css.push(`margin-top:${twipsToPoints(style.spaceBefore)}pt`);
    if (style.spaceAfter) css.push(`margin-bottom:${twipsToPoints(style.spaceAfter)}pt`);
    if (style.lineSpacing) css.push(`line-height:${rtfLineSpacingToCss(style)}`);
    const data = [
        `data-rtf-align="${style.alignment}"`,
        `data-rtf-li="${style.leftIndent}"`,
        `data-rtf-ri="${style.rightIndent}"`,
        `data-rtf-fi="${style.firstLineIndent}"`,
        `data-rtf-sb="${style.spaceBefore}"`,
        `data-rtf-sa="${style.spaceAfter}"`,
        `data-rtf-sl="${style.lineSpacing}"`,
        `data-rtf-slmult="${style.lineSpacingMultiple ? 1 : 0}"`
    ];
    if (preserveEmpty)
        data.push('data-rtf-preserve-empty="1"');
    if (css.length)
        data.push(`style="${css.join(';')}"`);
    return ` ${data.join(' ')}`;
}

function runToHtml(run: RtfRun, documentModel: RtfDocument): string {
    let content = escapeHtml(run.text).replace(/\n/g, '<br>').replace(/\t/g, '&#9;');
    const styles: string[] = [];
    const font = documentModel.fonts.get(run.style.fontIndex);
    const color = documentModel.colors.get(run.style.colorIndex);
    const highlight = documentModel.colors.get(run.style.highlightIndex);
    if (font) styles.push(`font-family:${escapeHtmlAttribute(font)}`);
    if (run.style.fontSize) styles.push(`font-size:${run.style.fontSize / 2}pt`);
    if (color) styles.push(`color:${color}`);
    if (highlight) styles.push(`background-color:${highlight}`);
    if (styles.length)
        content = `<span style="${styles.join(';')}">${content}</span>`;
    if (run.style.strike) content = `<s>${content}</s>`;
    if (run.style.underline) content = `<u>${content}</u>`;
    if (run.style.italic) content = `<em>${content}</em>`;
    if (run.style.bold) content = `<strong>${content}</strong>`;
    return content;
}

function findGroupEnd(source: string, start: number): number {
    let depth = 0;
    for (let index = start; index < source.length; index++) {
        if (source[index] === '\\') {
            if (source[index + 1] === "'") index += 3;
            else if (['\\', '{', '}'].includes(source[index + 1])) index++;
            continue;
        }
        if (source[index] === '{') depth++;
        else if (source[index] === '}' && --depth === 0) return index;
    }
    return -1;
}

function getGroupDestination(source: string, start: number, end: number): { word: string; ignorable: boolean; contentStart: number } {
    let index = start;
    while (index < end && /[\r\n\t ]/.test(source[index])) index++;
    let ignorable = false;
    if (source.startsWith('\\*', index)) {
        ignorable = true;
        index += 2;
        while (index < end && /[\r\n\t ]/.test(source[index])) index++;
    }
    const match = source.slice(index, end).match(/^\\([a-zA-Z]+)/);
    return { word: match?.[1]?.toLowerCase() ?? '', ignorable, contentStart: start };
}

type RtfControlToken =
    | { kind: 'word'; word: string; arg: number | null; nextIndex: number }
    | { kind: 'hex'; byte: number; nextIndex: number }
    | { kind: 'text'; text: string; nextIndex: number }
    | { kind: 'symbol'; symbol: string; nextIndex: number };

function readControlToken(source: string, start: number, end: number): RtfControlToken {
    const next = source[start + 1] ?? '';
    if (['\\', '{', '}'].includes(next))
        return { kind: 'text', text: next, nextIndex: start + 2 };
    if (next === "'") {
        const hex = source.slice(start + 2, start + 4);
        return { kind: 'hex', byte: Number.parseInt(hex, 16) || 0, nextIndex: Math.min(end, start + 4) };
    }
    if (!/[a-zA-Z]/.test(next))
        return { kind: 'symbol', symbol: next, nextIndex: Math.min(end, start + 2) };

    const match = source.slice(start + 1, end).match(/^([a-zA-Z]+)(-?\d*)/);
    if (!match)
        return { kind: 'symbol', symbol: next, nextIndex: start + 2 };
    let nextIndex = start + 1 + match[0].length;
    if (source[nextIndex] === ' ')
        nextIndex++;
    return {
        kind: 'word',
        word: match[1].toLowerCase(),
        arg: match[2] ? Number(match[2]) : null,
        nextIndex
    };
}

function skipUnicodeFallback(source: string, start: number, end: number, length: number): number {
    let index = start;
    let remaining = length;
    while (index < end && remaining > 0) {
        if (source[index] === '\r' || source[index] === '\n') {
            index++;
            continue;
        }
        if (source[index] === '\\') {
            const token = readControlToken(source, index, end);
            if (token.kind === 'hex' || token.kind === 'text' || token.kind === 'symbol') {
                remaining--;
                index = token.nextIndex;
                continue;
            }
            break;
        }
        remaining--;
        index++;
    }
    return index;
}

function parseFontTable(source: string): Map<number, string> {
    const table = extractDestinationGroup(source, 'fonttbl');
    const fonts = new Map<number, string>();
    if (table) {
        const pattern = /\{\\f(\d+)([\s\S]*?);\}/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(table))) {
            const name = match[2]
                .replace(/\\'[0-9a-fA-F]{2}/g, encoded => decodeCp1252(Number.parseInt(encoded.slice(2), 16)))
                .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
                .replace(/[{}\r\n]/g, '')
                .trim();
            if (name)
                fonts.set(Number(match[1]), name);
        }
    }
    if (!fonts.size)
        fonts.set(0, DEFAULT_FONT);
    return fonts;
}

function parseColorTable(source: string): Map<number, string> {
    const table = extractDestinationGroup(source, 'colortbl');
    const colors = new Map<number, string>();
    if (!table)
        return colors;
    const bodyStart = table.indexOf('\\colortbl') + '\\colortbl'.length;
    table.slice(bodyStart).split(';').forEach((entry, index) => {
        const red = entry.match(/\\red(\d+)/)?.[1];
        const green = entry.match(/\\green(\d+)/)?.[1];
        const blue = entry.match(/\\blue(\d+)/)?.[1];
        if (red !== undefined && green !== undefined && blue !== undefined)
            colors.set(index, rgbToHex(Number(red), Number(green), Number(blue)));
    });
    return colors;
}

function extractDestinationGroup(source: string, destination: string): string | null {
    const marker = `\\${destination}`;
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1)
        return null;
    let start = markerIndex;
    while (start >= 0 && source[start] !== '{') start--;
    if (start < 0)
        return null;
    const end = findGroupEnd(source, start);
    return end === -1 ? null : source.slice(start, end + 1);
}

function serializeEditorChildren(container: HTMLElement, inherited: HtmlCharacterStyle, fontIndexes: Map<string, number>, colorIndexes: Map<string, number>): string {
    const nodes = Array.from(container.childNodes);
    const hasBlocks = nodes.some(node => node.nodeType === Node.ELEMENT_NODE && isBlockElement(node as HTMLElement));
    if (!hasBlocks)
        return `${serializeInlineNodes(nodes, inherited, fontIndexes, colorIndexes)}\\par `;
    return nodes.map(node => {
        if (node.nodeType === Node.ELEMENT_NODE && isBlockElement(node as HTMLElement))
            return serializeParagraph(node as HTMLElement, inherited, fontIndexes, colorIndexes);
        if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim())
            return '';
        return `${serializeInlineNode(node, inherited, fontIndexes, colorIndexes)}\\par `;
    }).join('');
}

function serializeParagraph(element: HTMLElement, inherited: HtmlCharacterStyle, fontIndexes: Map<string, number>, colorIndexes: Map<string, number>): string {
    const paragraphControls = htmlParagraphControls(element);
    const children = Array.from(element.childNodes);
    const content = children.length === 1 && children[0].nodeType === Node.ELEMENT_NODE
        && (children[0] as HTMLElement).tagName.toLowerCase() === 'br'
        ? ''
        : serializeInlineNodes(children, inherited, fontIndexes, colorIndexes);
    return `\\pard${paragraphControls} ${content}\\par `;
}

function serializeInlineNodes(nodes: ChildNode[], inherited: HtmlCharacterStyle, fontIndexes: Map<string, number>, colorIndexes: Map<string, number>): string {
    return nodes.map(node => serializeInlineNode(node, inherited, fontIndexes, colorIndexes)).join('');
}

function serializeInlineNode(node: ChildNode, inherited: HtmlCharacterStyle, fontIndexes: Map<string, number>, colorIndexes: Map<string, number>): string {
    if (node.nodeType === Node.TEXT_NODE)
        return escapeRtfText(node.textContent ?? '');
    if (node.nodeType !== Node.ELEMENT_NODE)
        return '';

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'br')
        return '\\line ';
    if (isBlockElement(element))
        return serializeParagraph(element, inherited, fontIndexes, colorIndexes);

    const next = getHtmlCharacterStyle(element, inherited);
    if (element.classList.contains('rtf-narrative-link')) {
        next.color = NARRATIVE_KEYWORD_COLOR;
        next.underline = true;
    }
    const before = htmlFormatDelta(inherited, next, fontIndexes, colorIndexes);
    const children = serializeInlineNodes(Array.from(element.childNodes), next, fontIndexes, colorIndexes);
    const after = htmlFormatDelta(next, inherited, fontIndexes, colorIndexes);
    return `${before}${children}${after}`;
}

function htmlFormatDelta(from: HtmlCharacterStyle, to: HtmlCharacterStyle, fontIndexes: Map<string, number>, colorIndexes: Map<string, number>): string {
    const controls: string[] = [];
    if (from.bold !== to.bold) controls.push(`\\b${to.bold ? '' : '0'} `);
    if (from.italic !== to.italic) controls.push(`\\i${to.italic ? '' : '0'} `);
    if (from.underline !== to.underline) controls.push(to.underline ? '\\ul ' : '\\ulnone ');
    if (from.strike !== to.strike) controls.push(`\\strike${to.strike ? '' : '0'} `);
    if (normalizeFontName(from.fontFamily) !== normalizeFontName(to.fontFamily))
        controls.push(`\\f${fontIndexes.get(normalizeFontName(to.fontFamily)) ?? 0} `);
    if (from.fontSize !== to.fontSize) controls.push(`\\fs${Math.round(to.fontSize * 2)} `);
    if (from.color !== to.color) controls.push(`\\cf${to.color ? colorIndexes.get(to.color) ?? 0 : 0} `);
    if (from.highlight !== to.highlight) controls.push(`\\highlight${to.highlight ? colorIndexes.get(to.highlight) ?? 0 : 0} `);
    return controls.join('');
}

function getHtmlCharacterStyle(element: HTMLElement, inherited: HtmlCharacterStyle): HtmlCharacterStyle {
    const tag = element.tagName.toLowerCase();
    const next = { ...inherited };
    if (['strong', 'b'].includes(tag)) next.bold = true;
    if (['em', 'i'].includes(tag)) next.italic = true;
    if (tag === 'u') next.underline = true;
    if (['s', 'strike', 'del'].includes(tag)) next.strike = true;
    if (element.style.fontWeight && Number(element.style.fontWeight) >= 600) next.bold = true;
    if (element.style.fontStyle === 'italic') next.italic = true;
    if (element.style.textDecorationLine.includes('underline')) next.underline = true;
    if (element.style.textDecorationLine.includes('line-through')) next.strike = true;
    if (element.style.fontFamily) next.fontFamily = firstFontFamily(element.style.fontFamily);
    if (element.style.fontSize) next.fontSize = cssSizeToPoints(element.style.fontSize, inherited.fontSize);
    if (element.style.color) next.color = normalizeCssColor(element.style.color);
    if (element.style.backgroundColor) next.highlight = normalizeCssColor(element.style.backgroundColor);
    if (tag === 'font') {
        if (element.getAttribute('face')) next.fontFamily = firstFontFamily(element.getAttribute('face') ?? '');
        if (element.getAttribute('color')) next.color = normalizeCssColor(element.getAttribute('color') ?? '');
    }
    return next;
}

function htmlParagraphControls(element: HTMLElement): string {
    const alignment = (element.dataset['rtfAlign'] ?? element.style.textAlign ?? 'left') as ParagraphAlignment;
    const controls = [alignment === 'center' ? '\\qc' : alignment === 'right' ? '\\qr' : alignment === 'justify' ? '\\qj' : '\\ql'];
    const values: Array<[string, string | undefined, string]> = [
        ['li', element.dataset['rtfLi'], element.style.marginLeft],
        ['ri', element.dataset['rtfRi'], element.style.marginRight],
        ['fi', element.dataset['rtfFi'], element.style.textIndent],
        ['sb', element.dataset['rtfSb'], element.style.marginTop],
        ['sa', element.dataset['rtfSa'], element.style.marginBottom]
    ];
    values.forEach(([control, exact, css]) => {
        const twips = exact !== undefined ? Number(exact) : pointsToTwips(cssSizeToPoints(css, 0));
        if (Number.isFinite(twips) && twips !== 0) controls.push(`\\${control}${Math.round(twips)}`);
    });
    const lineSpacing = Number(element.dataset['rtfSl'] ?? 0);
    if (lineSpacing) {
        controls.push(`\\sl${Math.round(lineSpacing)}`);
        controls.push(`\\slmult${element.dataset['rtfSlmult'] === '1' ? 1 : 0}`);
    }
    return controls.join('');
}

function collectHtmlFonts(container: HTMLElement): string[] {
    const fonts = [DEFAULT_FONT];
    container.querySelectorAll<HTMLElement>('[style*="font-family"], font[face]').forEach(element => {
        const font = firstFontFamily(element.style.fontFamily || element.getAttribute('face') || '');
        if (font && !fonts.some(item => normalizeFontName(item) === normalizeFontName(font)))
            fonts.push(font);
    });
    return fonts;
}

function collectHtmlColors(container: HTMLElement): string[] {
    const colors: string[] = [];
    const add = (value: string | null): void => {
        const color = normalizeCssColor(value ?? '');
        if (color && !colors.includes(color)) colors.push(color);
    };
    container.querySelectorAll<HTMLElement>('[style*="color"], font[color], .rtf-narrative-link').forEach(element => {
        add(element.classList.contains('rtf-narrative-link') ? NARRATIVE_KEYWORD_COLOR : element.style.color || element.getAttribute('color'));
        add(element.style.backgroundColor);
    });
    return colors;
}

function buildRtfDocument(body: string, fonts: string[], colors: string[]): string {
    const fontTable = fonts.map((font, index) => `{\\f${index}\\fnil\\fcharset0 ${escapeRtfText(font)};}`).join('');
    const colorTable = colors.map(color => {
        const { red, green, blue } = hexToRgb(color);
        return `\\red${red}\\green${green}\\blue${blue};`;
    }).join('');
    return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang3082{\\fonttbl${fontTable}}{\\colortbl ;${colorTable}}\\viewkind4\\uc1\\pard\\f0\\fs24 ${body}\\par}`;
}

function sanitizeEditorHtml(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = value;
    sanitizeNode(container);
    return container.innerHTML;
}

function sanitizeNode(node: Node): void {
    Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE)
            return;
        if (child.nodeType !== Node.ELEMENT_NODE) {
            child.remove();
            return;
        }
        const element = child as HTMLElement;
        const tag = element.tagName.toLowerCase();
        const allowed = ['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'br', 'div', 'p', 'span', 'font'];
        if (!allowed.includes(tag)) {
            element.replaceWith(document.createTextNode(element.textContent ?? ''));
            return;
        }

        const isKeyword = element.classList.contains('rtf-narrative-link');
        Array.from(element.attributes).forEach(attribute => {
            const keepData = attribute.name.startsWith('data-rtf-')
                || (isKeyword && ['data-entity-id', 'data-entity-kind', 'data-target-url'].includes(attribute.name));
            const keep = attribute.name === 'style' || keepData
                || (isKeyword && ['class', 'contenteditable', 'spellcheck', 'autocorrect', 'draggable', 'title'].includes(attribute.name))
                || (tag === 'font' && ['face', 'color'].includes(attribute.name));
            if (!keep) element.removeAttribute(attribute.name);
        });
        sanitizeInlineStyle(element);
        sanitizeNode(element);
    });
}

function sanitizeInlineStyle(element: HTMLElement): void {
    const allowed = new Set([
        'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration-line',
        'color', 'background-color', 'text-align', 'margin-left', 'margin-right',
        'margin-top', 'margin-bottom', 'text-indent', 'line-height'
    ]);
    Array.from(element.style).forEach(property => {
        if (!allowed.has(property)) element.style.removeProperty(property);
    });
}

function trimEditorHtmlEdges(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = value;
    while (container.firstChild && isEmptyEditorBoundaryNode(container.firstChild)) container.firstChild.remove();
    while (container.lastChild && isEmptyEditorBoundaryNode(container.lastChild)) container.lastChild.remove();
    return container.innerHTML;
}

function isEmptyEditorBoundaryNode(node: ChildNode): boolean {
    if (node.nodeType === Node.TEXT_NODE)
        return !(node.textContent ?? '').replace(/\u00a0/g, ' ').trim();
    if (node.nodeType !== Node.ELEMENT_NODE)
        return true;
    const element = node as HTMLElement;
    if (element.dataset['rtfPreserveEmpty'] === '1')
        return false;
    if (element.classList.contains('rtf-narrative-link'))
        return false;
    const tag = element.tagName.toLowerCase();
    if (tag === 'br') return true;
    if (!['div', 'p'].includes(tag)) return false;
    return Array.from(element.childNodes).every(child => isEmptyEditorBoundaryNode(child));
}

function textToHtml(value: string): string {
    if (!value) return '';
    return value.split(/\r?\n/).map(line => `<p>${escapeHtml(line) || '<br>'}</p>`).join('');
}

function htmlToText(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = sanitizeEditorHtml(value);
    const read = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const element = node as HTMLElement;
        if (element.tagName.toLowerCase() === 'br') return '\n';
        const content = Array.from(element.childNodes).map(read).join('');
        return isBlockElement(element) ? `${content}\n` : content;
    };
    return Array.from(container.childNodes).map(read).join('')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n$/, '');
}

function isBlockElement(element: HTMLElement): boolean {
    return ['p', 'div'].includes(element.tagName.toLowerCase());
}

function createDefaultHtmlStyle(): HtmlCharacterStyle {
    return {
        bold: false, italic: false, underline: false, strike: false,
        fontFamily: DEFAULT_FONT, fontSize: 12, color: null, highlight: null
    };
}

function decodeCp1252(byte: number): string {
    return String.fromCodePoint(CP1252_SPECIAL[byte] ?? byte);
}

function escapeRtfText(value: string): string {
    let result = '';
    for (const char of value) {
        const codePoint = char.codePointAt(0) ?? 0;
        if (char === '\\' || char === '{' || char === '}') {
            result += `\\${char}`;
        } else if (char === '\u00A0') {
            result += '\\~';
        } else if (char === '\n') {
            result += '\\line ';
        } else if (char === '\t') {
            result += '\\tab ';
        } else if (codePoint >= 0x20 && codePoint <= 0x7E) {
            result += char;
        } else {
            const cp1252 = codePoint <= 0xFF ? codePoint : UNICODE_TO_CP1252.get(codePoint);
            if (cp1252 !== undefined)
                result += `\\'${cp1252.toString(16).padStart(2, '0')}`;
            else {
                for (let index = 0; index < char.length; index++) {
                    const code = char.charCodeAt(index);
                    result += `\\u${code > 32767 ? code - 65536 : code}?`;
                }
            }
        }
    }
    return result;
}

function normalizeCssColor(value: string): string | null {
    const clean = value.trim();
    if (!clean || clean === 'transparent' || clean === 'rgba(0, 0, 0, 0)') return null;
    if (/^#[0-9a-f]{6}$/i.test(clean)) return clean.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(clean))
        return `#${clean.slice(1).split('').map(char => char + char).join('')}`.toUpperCase();
    const rgb = clean.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    return rgb ? rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])) : null;
}

function rgbToHex(red: number, green: number, blue: number): string {
    return `#${[red, green, blue].map(value => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function hexToRgb(value: string): { red: number; green: number; blue: number } {
    const color = normalizeCssColor(value) ?? '#000000';
    return { red: Number.parseInt(color.slice(1, 3), 16), green: Number.parseInt(color.slice(3, 5), 16), blue: Number.parseInt(color.slice(5, 7), 16) };
}

function firstFontFamily(value: string): string {
    return value.split(',')[0].replace(/["']/g, '').trim() || DEFAULT_FONT;
}

function normalizeFontName(value: string): string {
    return firstFontFamily(value).toLocaleLowerCase();
}

function cssSizeToPoints(value: string, fallback: number): number {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return fallback;
    if (value.endsWith('px')) return amount * 0.75;
    if (value.endsWith('em') || value.endsWith('rem')) return amount * 12;
    return amount;
}

function twipsToPoints(value: number): number {
    return Math.round((value / 20) * 100) / 100;
}

function pointsToTwips(value: number): number {
    return Math.round(value * 20);
}

function rtfLineSpacingToCss(style: RtfParagraphStyle): string {
    if (style.lineSpacingMultiple)
        return String(Math.max(1, Math.abs(style.lineSpacing) / 240));
    return `${twipsToPoints(Math.abs(style.lineSpacing))}pt`;
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeHtmlAttribute(value: string): string {
    return escapeHtml(value).replace(/;/g, '');
}
