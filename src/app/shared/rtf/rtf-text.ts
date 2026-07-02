export function plainTextToRtf(value: string): string {
    const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\r?\n/g, '\\par ');
    return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Microsoft Sans Serif;}}\\viewkind4\\uc1\\pard\\f0\\fs24 ${escaped}\\par}`;
}

export function rtfToPlainText(value: string): string {
    if (!value.trim().startsWith('{\\rtf'))
        return value;

    return stripRtfGroups(value, ['\\fonttbl', '\\colortbl', '\\*\\generator'])
        .replace(/\\par[d]?/g, '\n')
        .replace(/\\line/g, '\n')
        .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\u(-?\d+)\??/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/\\[a-zA-Z]+-?\d*/g, '')
        .replace(/[{}]/g, '')
        .replace(/\\([{}\\])/g, '$1')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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
