package es.yosiftware.libros.datos.rtf

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Leer y volver a escribir como la web: lo esperado sale del `rtf-text.ts` de la web (`htmlToRtf(rtfToHtml(rtf))` y
 * `rtfToPlainText`), calculado en Chromium. La paridad con todo el texto de QA está en [ParidadRtfConLaWebTest].
 */
class EscritorRtfTest {
    private fun comoLaWeb(original: String, guardado: String, texto: String) {
        val documento = DocumentoRtf.de(original)
        assertEquals(guardado, EscritorRtf.escribir(documento))
        assertEquals(texto, EscritorRtf.texto(documento))
        // Lo guardado se vuelve a leer igual.
        assertEquals(guardado, EscritorRtf.escribir(DocumentoRtf.de(guardado)))
    }

    @Test
    fun losFormatosDeRichEdit() = comoLaWeb(
        """{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}{\f1\fnil Georgia;}}
{\colortbl ;\red245\green222\blue179;\red80\green80\blue80;}
{\*\generator Riched20 10.0.26100}\viewkind4\uc1 
\pard\f0\fs24 Normal \b negrita\b0  \i cursiva\i0  \ul subrayado\ulnone  \strike tachado\strike0 .\par
\pard\qc\li720\fi-360\sb120\sa240\sl276\slmult1\f1\fs32\cf1\highlight2 Centrado\line con salto\tab y tabulador\par
\pard\par
\f0\fs21 Acentos: canci\'f3n, a\~b, c\_d, raya \u8212? y \{llaves\}.\par
}""",
        """{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}{\f1\fnil\fcharset0 Georgia;}}{\colortbl ;\red245\green222\blue179;\red80\green80\blue80;}\viewkind4\uc1\pard\f0\fs24 \pard\ql Normal \b negrita\b0  \i cursiva\i0  \ul subrayado\ulnone  \strike tachado\strike0 .\par \pard\qc\li720\fi-360\sb120\sa240\sl276\slmult1 \f1 \fs32 \cf1 \highlight2 Centrado\line con salto\tab y tabulador\f0 \fs24 \cf0 \highlight0 \par \pard\ql \par \pard\ql \fs21 \cf1 \highlight2 Acentos: canci\'f3n, a\~b, c\u8209?d, raya \'97 y \{llaves\}.\fs24 \cf0 \highlight0 \par}""",
        """Normal negrita cursiva subrayado tachado.
Centrado
con salto	y tabulador

Acentos: canción, a b, c‑d, raya — y {llaves}.""",
    )

    @Test
    fun elTextoPlanoSinLineasEnBlancoEnLosBordes() = comoLaWeb(
        """
  
Primera línea

   con blancos   
Última

""",
        """{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}}{\colortbl ;}\viewkind4\uc1\pard\f0\fs24 \pard\ql Primera l\'ednea\par \pard\ql \par \pard\ql    con blancos   \par \pard\ql \'daltima\par}""",
        """Primera línea

con blancos
Última""",
    )

    @Test
    fun unRtfVacio() = comoLaWeb(
        """{\rtf1}""",
        """{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}}{\colortbl ;}\viewkind4\uc1\pard\f0\fs24 \pard\ql \par}""",
        """""",
    )

    @Test
    fun losGruposDesconocidosEIgnorablesNoSeLeen() = comoLaWeb(
        """{\rtf1\ansi{\fonttbl{\f0 Arial;}}{\b dentro}{\lang1034 desconocido}{\*\ignorado nada} fuera\par}""",
        """{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}{\f1\fnil\fcharset0 Arial;}}{\colortbl ;}\viewkind4\uc1\pard\f0\fs24 \pard\ql \b \f1 dentro\f0 \b0 \f1  fuera\f0 \par}""",
        """dentro fuera""",
    )

    @Test
    fun escapaComoLaWeb() {
        assertEquals("""a\\b\{c\}""", EscritorRtf.escapar("""a\b{c}"""))
        // «á», «€», un salto y un tabulador.
        assertEquals("""\'e1\'80\line \tab """, EscritorRtf.escapar(String(intArrayOf(0xE1, 0x20AC, 0x0A, 0x09), 0, 4)))
        // Fuera de CP1252, cada unidad UTF-16 con su número (un emoji son dos).
        assertEquals("""\u-10179?\u-8704?""", EscritorRtf.escapar(String(Character.toChars(0x1F600))))
    }
}
