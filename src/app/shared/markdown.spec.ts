import { renderSafeMarkdown } from './markdown';

describe('renderSafeMarkdown', () => {
    it('escapes HTML before rendering allowed Markdown', () => {
        const html = renderSafeMarkdown('<img src=x onerror=alert(1)> **seguro**');

        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).toContain('<strong>seguro</strong>');
    });

    it('only turns http links into links with safe navigation attributes', () => {
        expect(renderSafeMarkdown('[Lectura](https://example.com)')).toContain('rel="noopener noreferrer"');
        expect(renderSafeMarkdown('[No](javascript:alert(1))')).not.toContain('<a ');
    });
});
