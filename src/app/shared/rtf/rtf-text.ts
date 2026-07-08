export function plainTextToRtf(value: string): string {
    const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\r?\n/g, '\\par ');
    return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Microsoft Sans Serif;}}\\viewkind4\\uc1\\pard\\f0\\fs24 ${escaped}\\par}`;
}

export function rtfToPlainText(value: string): string {
    return htmlToText(rtfToHtml(value)).trim();
}

export function rtfToHtml(value: string): string {
    if (!value.trim().startsWith('{\\rtf'))
        return textToHtml(value);

    const source = stripRtfGroups(value, ['\\fonttbl', '\\colortbl', '\\*\\generator']);
    let html = '';
    const format: RtfFormatState = { bold: false, italic: false, underline: false, strike: false };

    for (let index = 0; index < source.length; index++) {
        const char = source[index];

        if (char === '{' || char === '}')
            continue;

        if (char !== '\\') {
            html += escapeHtml(char);
            continue;
        }

        const next = source[index + 1];
        if (next === '\\' || next === '{' || next === '}') {
            html += escapeHtml(next);
            index++;
            continue;
        }

        if (next === "'") {
            const hex = source.slice(index + 2, index + 4);
            html += escapeHtml(String.fromCharCode(parseInt(hex, 16)));
            index += 3;
            continue;
        }

        const control = source.slice(index + 1).match(/^([a-zA-Z]+)(-?\d*) ?/);
        if (!control)
            continue;

        const [, word, rawArg] = control;
        const arg = rawArg === '' ? null : Number(rawArg);
        index += control[0].length;
        html += applyRtfControl(word, arg, format);
    }

    html += closeAllFormats(format);
    return normalizeEditorHtml(html);
}

export function htmlToRtf(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = trimEditorHtmlEdges(sanitizeEditorHtml(value));
    const body = Array.from(container.childNodes)
        .map(node => nodeToRtf(node, { bold: false, italic: false, underline: false, strike: false }))
        .join('')
        .replace(/^(?:\\par\s*)+/g, '')
        .replace(/(?:\\par\s*)+$/g, '');
    return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Microsoft Sans Serif;}}\\viewkind4\\uc1\\pard\\f0\\fs24 ${body}\\par}`;
}

function stripRtfGroups(value: string, groupMarkers: string[]): string {
    let result = '';
    for (let index = 0; index < value.length; index++) {
        const marker = groupMarkers.find(item => value.startsWith(item, index));
        if (!marker) {
            result += value[index];
            continue;
        }

        let depth = 0;
        let start = index;
        while (start >= 0 && value[start] !== '{')
            start--;
        index = start >= 0 ? start : index;

        for (; index < value.length; index++) {
            if (value[index] === '{')
                depth++;
            else if (value[index] === '}') {
                depth--;
                if (depth <= 0)
                    break;
            }
        }
    }
    return result;
}

interface RtfFormatState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
}

function applyRtfControl(word: string, arg: number | null, format: RtfFormatState): string {
    switch (word) {
        case 'b':
            return toggleFormat(format, 'bold', arg !== 0, 'strong');
        case 'i':
            return toggleFormat(format, 'italic', arg !== 0, 'em');
        case 'ul':
            return toggleFormat(format, 'underline', arg !== 0, 'u');
        case 'ulnone':
            return toggleFormat(format, 'underline', false, 'u');
        case 'strike':
            return toggleFormat(format, 'strike', arg !== 0, 's');
        case 'par':
        case 'line':
            return '<br>';
        case 'tab':
            return ' ';
        case 'u':
            return arg === null ? '' : escapeHtml(String.fromCharCode(arg));
        default:
            return '';
    }
}

function toggleFormat(format: RtfFormatState, key: keyof RtfFormatState, enabled: boolean, tag: string): string {
    if (format[key] === enabled)
        return '';
    format[key] = enabled;
    return enabled ? `<${tag}>` : `</${tag}>`;
}

function closeAllFormats(format: RtfFormatState): string {
    return [
        toggleFormat(format, 'strike', false, 's'),
        toggleFormat(format, 'underline', false, 'u'),
        toggleFormat(format, 'italic', false, 'em'),
        toggleFormat(format, 'bold', false, 'strong')
    ].join('');
}

function nodeToRtf(node: ChildNode, inherited: RtfFormatState): string {
    if (node.nodeType === Node.TEXT_NODE)
        return escapeRtf(node.textContent ?? '');

    if (node.nodeType !== Node.ELEMENT_NODE)
        return '';

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'br')
        return '\\par ';

    const next = {
        bold: inherited.bold || ['b', 'strong'].includes(tag),
        italic: inherited.italic || ['i', 'em'].includes(tag),
        underline: inherited.underline || tag === 'u',
        strike: inherited.strike || ['s', 'strike', 'del'].includes(tag)
    };
    const before = formatDelta(inherited, next);
    const children = Array.from(element.childNodes).map(child => nodeToRtf(child, next)).join('');
    const after = formatDelta(next, inherited);
    const blockBreak = ['div', 'p'].includes(tag) ? '\\par ' : '';
    return `${before}${children}${after}${blockBreak}`;
}

function formatDelta(from: RtfFormatState, to: RtfFormatState): string {
    return [
        from.bold !== to.bold ? `\\b${to.bold ? '' : '0'} ` : '',
        from.italic !== to.italic ? `\\i${to.italic ? '' : '0'} ` : '',
        from.underline !== to.underline ? (to.underline ? '\\ul ' : '\\ulnone ') : '',
        from.strike !== to.strike ? `\\strike${to.strike ? '' : '0'} ` : ''
    ].join('');
}

function sanitizeEditorHtml(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = value;
    sanitizeNode(container);
    return container.innerHTML;
}

function trimEditorHtmlEdges(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = value;

    while (container.firstChild && isEmptyEditorBoundaryNode(container.firstChild))
        container.firstChild.remove();
    while (container.lastChild && isEmptyEditorBoundaryNode(container.lastChild))
        container.lastChild.remove();

    return container.innerHTML;
}

function isEmptyEditorBoundaryNode(node: ChildNode): boolean {
    if (node.nodeType === Node.TEXT_NODE)
        return !(node.textContent ?? '').replace(/\u00a0/g, ' ').trim();
    if (node.nodeType !== Node.ELEMENT_NODE)
        return true;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === 'br')
        return true;
    if (!['div', 'p'].includes(tag))
        return false;

    return Array.from(element.childNodes).every(child => isEmptyEditorBoundaryNode(child));
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
        const allowed = ['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'br', 'div', 'p'];
        if (!allowed.includes(tag)) {
            const text = document.createTextNode(element.textContent ?? '');
            element.replaceWith(text);
            return;
        }

        Array.from(element.attributes).forEach(attribute => element.removeAttribute(attribute.name));
        sanitizeNode(element);
    });
}

function normalizeEditorHtml(value: string): string {
    return value
        .replace(/^(<br>)+/g, '')
        .replace(/(<br>)+$/g, '')
        .replace(/<b>/g, '<strong>')
        .replace(/<\/b>/g, '</strong>')
        .replace(/<i>/g, '<em>')
        .replace(/<\/i>/g, '</em>')
        .replace(/<strike>/g, '<s>')
        .replace(/<\/strike>/g, '</s>')
        .replace(/<del>/g, '<s>')
        .replace(/<\/del>/g, '</s>');
}

function textToHtml(value: string): string {
    return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function htmlToText(value: string): string {
    const container = document.createElement('div');
    container.innerHTML = sanitizeEditorHtml(value.replace(/<br\s*\/?>/gi, '\n'));
    return (container.textContent ?? '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRtf(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\u00a0/g, ' ')
        .replace(/\r?\n/g, '\\par ');
}
