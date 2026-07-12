export function renderSafeMarkdown(value: string): string {
    const blocks = escapeHtml(value).trim().split(/\n\s*\n/).filter(Boolean);
    return blocks.map(block => {
        const lines = block.split(/\r?\n/);
        if (lines.every(line => /^[-*]\s+/.test(line)))
            return `<ul>${lines.map(line => `<li>${renderInline(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`;

        const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
        if (heading && lines.length === 1) {
            const level = heading[1].length + 1;
            return `<h${level}>${renderInline(heading[2])}</h${level}>`;
        }

        return `<p>${renderInline(block).replace(/\r?\n/g, '<br>')}</p>`;
    }).join('');
}

function renderInline(value: string): string {
    return value
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
        .replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
