import { TestBed } from '@angular/core/testing';
import { BOOK_TITLE_BANNER_CSP, BookTitleBannerComponent, bookTitleBannerDocument } from './book-title-banner.component';

describe('BookTitleBannerComponent', () => {
    function render(inputs: { title: string; html?: string | null; styles?: string | null; height?: number | string | null; layout?: 'wide' | 'compact' }) {
        const fixture = TestBed.createComponent(BookTitleBannerComponent);
        for (const [name, value] of Object.entries(inputs))
            fixture.componentRef.setInput(name, value);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('sin Html pinta la frase como texto, sin marco', () => {
        const element = render({ title: 'Bailando entre Brumas y Ceniza ⚙️ (¬‿¬)☁️✨', html: null });
        expect(element.querySelector('iframe')).toBeNull();
        expect(element.textContent?.trim()).toBe('Bailando entre Brumas y Ceniza ⚙️ (¬‿¬)☁️✨');
    });

    it('nunca interpreta la frase como HTML', () => {
        const element = render({ title: '<img src=x onerror=alert(1)>' });
        expect(element.querySelector('img')).toBeNull();
        expect(element.textContent).toContain('<img src=x onerror=alert(1)>');
    });

    it('pinta la cabecera en un iframe con sandbox vacío y la CSP propia', () => {
        const element = render({ title: 'Brumas', html: '<h1 class="t">Brumas</h1>', styles: 'h1{font-family:Lobster}' });
        const frame = element.querySelector('iframe')!;

        expect(frame.getAttribute('sandbox')).toBe('');
        expect(frame.sandbox.length).toBe(0);
        expect(frame.getAttribute('loading')).toBe('lazy');
        expect(frame.title).toBe('Brumas');
        const srcdoc = frame.srcdoc;
        expect(srcdoc).toContain(`<meta http-equiv="Content-Security-Policy" content="${BOOK_TITLE_BANNER_CSP}">`);
        expect(srcdoc).toContain('<style>h1{font-family:Lobster}</style>');
        expect(srcdoc).toContain('<body><h1 class="t">Brumas</h1></body>');
        // La frase sigue en el DOM de la página para los lectores de pantalla, como texto.
        expect(element.querySelector('p')?.textContent).toBe('Brumas');
        expect(element.querySelector('h1')).toBeNull();
    });

    it('la CSP del marco no deja scripts ni conexiones', () => {
        expect(BOOK_TITLE_BANNER_CSP).toContain("default-src 'none'");
        expect(BOOK_TITLE_BANNER_CSP).not.toContain('script-src');
        expect(BOOK_TITLE_BANNER_CSP).toContain('https://fonts.googleapis.com');
        expect(BOOK_TITLE_BANNER_CSP).toContain('https://fonts.gstatic.com');
    });

    it('un </style> en los estilos no sale del bloque', () => {
        expect(bookTitleBannerDocument('<p>x</p>', 'p{}</style><script>alert(1)</script>')).not.toContain('</style><script>');
    });

    it('el alto y el ancho los decide quien lo aloja', () => {
        let frame = render({ title: 'Brumas', html: '<h1>Brumas</h1>', height: 220, layout: 'compact' }).querySelector('iframe')!;
        expect(frame.style.height).toBe('220px');
        expect(frame.classList).toContain('banner--compact');

        frame = render({ title: 'Brumas', html: '<h1>Brumas</h1>', height: '12rem' }).querySelector('iframe')!;
        expect(frame.style.height).toBe('12rem');
        expect(frame.classList).not.toContain('banner--compact');
    });
});
