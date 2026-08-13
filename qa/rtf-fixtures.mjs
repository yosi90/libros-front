const header = String.raw`{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}`;
const footer = String.raw`\viewkind4\uc1\pard\f0\fs24 `;

function document(body, extraFonts = '', colors = '') {
    return `${header}${extraFonts}}{\\colortbl ;${colors}}${footer}${body}\\par}`;
}

export const fixtures = [
    {
        id: 'encoding-and-escapes',
        sourceRtf: document(String.raw`Caf\'e9, euro \'80, comillas \'93dobles\'94, llaves \{x\}, barra \\ y tab\tab fin.\par Unicode: \u28450?\u23383?; espa\'f1ol.`),
        webHtml: '<p>Café, euro €, comillas “dobles”, llaves {x}, barra \\ y tab&#9;fin.</p><p>Unicode: 漢字; español.</p>'
    },
    {
        id: 'inline-formatting',
        sourceRtf: document(
            String.raw`Normal \b negrita\b0 , \i cursiva\i0 , \ul subrayado\ulnone , \strike tachado\strike0 . \f1\fs32 Consolas 16\f0\fs24 . \cf1 rojo\cf0 , \highlight2 resaltado\highlight0  y \ul\cf3 keyword\cf0\ulnone .`,
            String.raw`{\f1\fmodern\fcharset0 Consolas;}`,
            String.raw`\red200\green20\blue20;\red255\green255\blue0;\red245\green222\blue179;`
        ),
        webHtml: '<p>Normal <strong>negrita</strong>, <em>cursiva</em>, <u>subrayado</u>, <s>tachado</s>. <span style="font-family:Consolas;font-size:16pt">Consolas 16</span>. <span style="color:#c81414">rojo</span>, <span style="background-color:#ffff00">resaltado</span> y <span class="rtf-narrative-link">keyword</span>.</p>'
    },
    {
        id: 'paragraph-formatting',
        sourceRtf: document(String.raw`\pard\qc\li720\ri360\fi-240\sb120\sa180\sl360\slmult1 Primer p\'e1rrafo centrado.\par \pard\qr Segundo\line l\'ednea\tab tabulada.\par \pard\qj Tercer p\'e1rrafo justificado.`),
        webHtml: '<p data-rtf-align="center" data-rtf-li="720" data-rtf-ri="360" data-rtf-fi="-240" data-rtf-sb="120" data-rtf-sa="180" data-rtf-sl="360" data-rtf-slmult="1">Primer párrafo centrado.</p><p data-rtf-align="right">Segundo<br>línea&#9;tabulada.</p><p data-rtf-align="justify">Tercer párrafo justificado.</p>'
    },
    {
        id: 'empty-paragraph',
        sourceRtf: document(String.raw`Primero.\par \pard\ql \par \pard\ql Tercero.`),
        webHtml: '<p>Primero.</p><p><br></p><p>Tercero.</p>'
    }
];
