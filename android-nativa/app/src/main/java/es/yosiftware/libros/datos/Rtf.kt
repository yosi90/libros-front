package es.yosiftware.libros.datos

import es.yosiftware.libros.datos.rtf.DocumentoRtf
import es.yosiftware.libros.datos.rtf.EscritorRtf
import es.yosiftware.libros.datos.rtf.LectorRtf

/**
 * El texto plano de un RTF (`rtfToPlainText` de la web): cada párrafo en su línea, sin formato. Lo que no empieza por
 * `{\rtf` se devuelve tal cual.
 */
fun rtfATexto(valor: String): String = if (DocumentoRtf.esRtf(valor)) EscritorRtf.texto(LectorRtf.leer(valor)) else valor
