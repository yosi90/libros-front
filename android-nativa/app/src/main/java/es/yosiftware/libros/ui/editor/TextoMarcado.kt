package es.yosiftware.libros.ui.editor

import es.yosiftware.libros.datos.rtf.DocumentoRtf
import es.yosiftware.libros.datos.rtf.EstiloDeLetra
import es.yosiftware.libros.datos.rtf.EstiloDeParrafo
import es.yosiftware.libros.datos.rtf.Parrafo
import es.yosiftware.libros.datos.rtf.Tramo

/** Un formato que va de [inicio] a [fin] (sin incluir) en el texto. */
data class Rango<T>(val inicio: Int, val fin: Int, val valor: T)

/**
 * El texto del editor con su formato, sin nada de Android: así se prueba en la JVM y la vista solo lo pinta. Los
 * párrafos se separan con `\n`; los `\n` de [saltos] son saltos de línea dentro del párrafo (`\line`). [letras] cubre
 * todo el texto sin huecos ni solapes (también los `\n`), y [parrafos] trae el formato de cada párrafo, en orden.
 */
data class TextoMarcado(
    val texto: String,
    val letras: List<Rango<EstiloDeLetra>>,
    val parrafos: List<EstiloDeParrafo>,
    val saltos: Set<Int> = emptySet(),
) {
    /** Dónde empieza y acaba (sin el `\n`) cada párrafo. */
    val limitesDeParrafos: List<IntRange>
        get() {
            val limites = mutableListOf<IntRange>()
            var inicio = 0
            texto.forEachIndexed { i, c ->
                if (c == '\n' && i !in saltos) {
                    limites.add(inicio until i)
                    inicio = i + 1
                }
            }
            limites.add(inicio until texto.length)
            return limites
        }

    /** El formato de letra del carácter [posicion] (o del anterior, al final). */
    fun letraEn(posicion: Int): EstiloDeLetra {
        val buscada = if (posicion >= texto.length) texto.length - 1 else posicion
        return letras.firstOrNull { buscada >= it.inicio && buscada < it.fin }?.valor
            ?: letras.lastOrNull { it.fin <= posicion }?.valor
            ?: EstiloDeLetra()
    }

    /** El índice del párrafo donde cae [posicion]. */
    fun parrafoEn(posicion: Int): Int = limitesDeParrafos.indexOfFirst { posicion <= it.last + 1 }.coerceAtLeast(0)

    /** Vuelve a documento: cada párrafo con sus tramos, sin los `\n` que los separan. */
    fun aDocumento(): DocumentoRtf {
        val limites = limitesDeParrafos
        if (texto.isEmpty()) return DocumentoRtf(emptyList())
        return DocumentoRtf(limites.mapIndexed { i, limite ->
            val tramos = mutableListOf<Tramo>()
            letras.forEach { rango ->
                val desde = maxOf(rango.inicio, limite.first)
                val hasta = minOf(rango.fin, limite.last + 1)
                if (desde >= hasta) return@forEach
                val trozo = texto.substring(desde, hasta)
                val anterior = tramos.lastOrNull()
                if (anterior != null && anterior.estilo == rango.valor) tramos[tramos.lastIndex] = Tramo(anterior.texto + trozo, anterior.estilo)
                else tramos.add(Tramo(trozo, rango.valor))
            }
            Parrafo(parrafos.getOrElse(i) { parrafos.lastOrNull() ?: EstiloDeParrafo() }, tramos)
        })
    }

    // --- Lo que hace la barra. ---

    /**
     * Cambia el formato de letra de [inicio] a [fin] con [cambio] (`execCommand` sobre la selección). Las palabras clave
     * ([protegidos]) no cambian, como en la web, que deja fuera del formato su texto.
     */
    fun cambiarLetra(inicio: Int, fin: Int, protegidos: List<IntRange> = emptyList(), cambio: (EstiloDeLetra) -> EstiloDeLetra): TextoMarcado {
        if (inicio >= fin) return this
        val nuevas = mutableListOf<Rango<EstiloDeLetra>>()
        letras.forEach { rango ->
            val cortes = sortedSetOf(rango.inicio, rango.fin)
            listOf(inicio, fin).forEach { if (it > rango.inicio && it < rango.fin) cortes.add(it) }
            protegidos.forEach { p ->
                listOf(p.first, p.last + 1).forEach { if (it > rango.inicio && it < rango.fin) cortes.add(it) }
            }
            cortes.zipWithNext().forEach { (desde, hasta) ->
                val dentro = desde >= inicio && hasta <= fin && protegidos.none { desde >= it.first && hasta <= it.last + 1 }
                nuevas.add(Rango(desde, hasta, if (dentro) cambio(rango.valor) else rango.valor))
            }
        }
        return copy(letras = juntar(nuevas))
    }

    /** Si todo el texto de [inicio] a [fin] cumple [condicion] (para saber si «Negrita» quita o pone). */
    fun todoCumple(inicio: Int, fin: Int, condicion: (EstiloDeLetra) -> Boolean): Boolean =
        if (inicio >= fin) condicion(letraEn(maxOf(0, inicio - 1)))
        else letras.filter { it.fin > inicio && it.inicio < fin && texto.substring(maxOf(it.inicio, inicio), minOf(it.fin, fin)).any { c -> c != '\n' } }
            .all { condicion(it.valor) }

    /** Cambia el formato de los párrafos que toca la selección (`getSelectedParagraphs`). */
    fun cambiarParrafos(inicio: Int, fin: Int, cambio: (EstiloDeParrafo) -> EstiloDeParrafo): TextoMarcado {
        val limites = limitesDeParrafos
        val desde = parrafoEn(inicio)
        val hasta = parrafoEn(maxOf(inicio, fin))
        return copy(parrafos = limites.indices.map { i ->
            val actual = parrafos.getOrElse(i) { EstiloDeParrafo() }
            if (i in desde..hasta) cambio(actual) else actual
        })
    }

    companion object {
        fun de(documento: DocumentoRtf): TextoMarcado {
            val texto = StringBuilder()
            val letras = mutableListOf<Rango<EstiloDeLetra>>()
            val saltos = mutableSetOf<Int>()
            documento.parrafos.forEachIndexed { i, parrafo ->
                parrafo.tramos.forEach { tramo ->
                    tramo.texto.forEachIndexed { j, c -> if (c == '\n') saltos.add(texto.length + j) }
                    letras.add(Rango(texto.length, texto.length + tramo.texto.length, tramo.estilo))
                    texto.append(tramo.texto)
                }
                if (i < documento.parrafos.lastIndex) {
                    // El `\n` que separa los párrafos lleva el formato del principio del siguiente: con el cursor al
                    // principio de un párrafo, la barra enseña su formato y lo que se escriba lo toma.
                    val siguiente = documento.parrafos[i + 1].tramos.firstOrNull()?.estilo
                    letras.add(Rango(texto.length, texto.length + 1, siguiente ?: parrafo.tramos.lastOrNull()?.estilo ?: EstiloDeLetra()))
                    texto.append('\n')
                }
            }
            return TextoMarcado(
                texto.toString(),
                juntar(letras),
                documento.parrafos.map { it.estilo }.ifEmpty { listOf(EstiloDeParrafo()) },
                saltos,
            )
        }

        /** Junta los rangos seguidos con el mismo formato y quita los vacíos. */
        fun <T> juntar(rangos: List<Rango<T>>): List<Rango<T>> {
            val juntos = mutableListOf<Rango<T>>()
            rangos.filter { it.fin > it.inicio }.sortedBy { it.inicio }.forEach { rango ->
                val ultimo = juntos.lastOrNull()
                if (ultimo != null && ultimo.fin == rango.inicio && ultimo.valor == rango.valor) juntos[juntos.lastIndex] = ultimo.copy(fin = rango.fin)
                else juntos.add(rango)
            }
            return juntos
        }
    }
}
