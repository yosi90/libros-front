import { TestBed } from '@angular/core/testing';
import { BookTitleBannerComponent } from './book-title-banner.component';
import { bookTitleBannerCsp, bookTitleBannerDocument, bookTitleBannerFontsUrl, ownBannerStyles } from './book-title-banner-document';

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
        const element = render({ title: 'Brumas', html: '<h1 class="t">Brumas</h1>', styles: 'h1{color:red}' });
        const frame = element.querySelector('iframe')!;

        expect(frame.getAttribute('sandbox')).toBe('');
        expect(frame.sandbox.length).toBe(0);
        expect(frame.getAttribute('loading')).toBe('lazy');
        expect(frame.title).toBe('Brumas');
        const srcdoc = frame.srcdoc;
        const fonts = bookTitleBannerFontsUrl(document.baseURI);
        expect(fonts).toBe(new URL('assets/fonts/', document.baseURI).href);
        expect(srcdoc).toContain(`<meta http-equiv="Content-Security-Policy" content="${bookTitleBannerCsp(fonts)}">`);
        expect(srcdoc).toContain(`<link rel="stylesheet" href="${fonts}fuentes.css">`);
        expect(srcdoc).toContain('<style>h1{color:red}</style>');
        expect(srcdoc).toContain('<body><h1 class="t">Brumas</h1></body>');
        // La frase sigue en el DOM de la página para los lectores de pantalla, como texto.
        expect(element.querySelector('p')?.textContent).toBe('Brumas');
        expect(element.querySelector('h1')).toBeNull();
    });

    it('la CSP del marco no deja scripts, conexiones ni otros orígenes: solo las tipografías propias', () => {
        const csp = bookTitleBannerCsp('https://libros.yosiftware.es/assets/fonts/');
        expect(csp).toBe("default-src 'none'; style-src 'unsafe-inline' https://libros.yosiftware.es/assets/fonts/; "
            + "font-src data: https://libros.yosiftware.es/assets/fonts/; img-src data:");
        expect(csp).not.toContain('script-src');
        for (const origin of ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'unpkg.com', 'cdn.jsdelivr.net'])
            expect(csp).not.toContain(origin);
    });

    it('un </style> en los estilos no sale del bloque', () => {
        expect(bookTitleBannerDocument('<p>x</p>', 'p{}</style><script>alert(1)</script>', 'https://x.test/assets/fonts/'))
            .not.toContain('</style><script>');
    });

    it('quita las hojas y fuentes de fuera y deja las data:', () => {
        const css = ownBannerStyles("@import url('https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&display=swap');\n"
            + "@import 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';\n"
            + "@font-face{font-family:X;src:url(https://fonts.gstatic.com/s/x.woff2) format('woff2')}\n"
            + "@font-face{font-family:Y;src:url(data:font/woff2;base64,AAAA)}\n"
            + '/* @import url(https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css); */ .t{background:url("https://cdn.jsdelivr.net/a.png")}');
        for (const origin of ['@import', 'googleapis', 'gstatic', 'cdnjs', 'unpkg', 'jsdelivr'])
            expect(css).not.toContain(origin);
        expect(css).toContain("@font-face{font-family:X;src:none format('woff2')}");
        expect(css).toContain('@font-face{font-family:Y;src:url(data:font/woff2;base64,AAAA)}');
        expect(css).toContain('.t{background:none}');
    });

    it('cada lista de fuentes lleva una propia de respaldo antes de su genérica', () => {
        expect(ownBannerStyles("body{font-family:'UnifrakturCook', 'Segoe UI Emoji', sans-serif;}"))
            .toBe("body{font-family:'UnifrakturCook', 'Segoe UI Emoji', 'Montserrat', sans-serif;}");
        expect(ownBannerStyles('h1{margin:0;font:600 28px Georgia,serif}')).toBe("h1{margin:0;font:600 28px Georgia,'Playfair Display', serif}");
        expect(ownBannerStyles("h1{font-family:'Pirata One', fantasy !important}")).toBe("h1{font-family:'Pirata One', 'Cinzel Decorative', fantasy !important}");
        expect(ownBannerStyles("h1{font-family:'Pacifico', cursive}")).toBe("h1{font-family:'Pacifico', 'MedievalSharp', cursive}");
        expect(ownBannerStyles("h1{font-family:'Bangers'}")).toBe("h1{font-family:'Bangers', 'Playfair Display'}");
        // Lo que ya es propio, monoespaciado o heredado no cambia; tampoco el resto de propiedades de letra.
        for (const css of ["h1{font-family:'Montserrat', sans-serif}", 'code{font-family:monospace}', 'p{font-family:inherit}',
            'p{font-family:var(--f)}', 'p{font-size:2em;font-weight:700}', 'p{font:inherit}'])
            expect(ownBannerStyles(css)).toBe(css);
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
