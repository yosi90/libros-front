package es.yosiftware.libros.datos.rtf

import java.text.Collator
import java.util.Locale

/**
 * Las palabras clave de la narración (src/app/shared/narrative-entity-links.ts): los nombres y apodos de los personajes
 * y los nombres de los demás elementos del libro. En el texto, cada mención con mayúscula y palabra completa enlaza a su
 * elemento; al guardar va con el color de palabra clave y subrayada, como en la aplicación de escritorio.
 */
enum class TipoDeEnlace(val ruta: String, val prioridad: Int) {
    PERSONAJE("characters", 0),
    LOCALIZACION("locations", 1),
    ORGANIZACION("organizations", 2),
    CONCEPTO("concepts", 3),
    EVENTO("events", 4),
    CITA("quotes", 5),
}

/** Un enlace: el elemento al que lleva y el texto que lo nombra. [titulo], el nombre principal («Abrir …»). */
data class EnlaceNarrativo(val id: Int, val tipo: TipoDeEnlace, val texto: String, val titulo: String)

/** Una mención encontrada en un texto: de [inicio] a [fin] (sin incluir). */
data class Mencion(val inicio: Int, val fin: Int, val enlace: EnlaceNarrativo)

object EnlacesNarrativos {
    /**
     * El orden de `localeCompare` en la web, para desempatar textos. En Android, `java.text.Collator` va sobre ICU, como
     * Chromium; en las pruebas de la JVM no (ignora los espacios), pero el orden de los empates no cambia lo que se marca.
     */
    private val comparador: Collator = Collator.getInstance(Locale.US)

    /**
     * `buildNarrativeEntityLinks`: un enlace por cada nombre de 2 o más caracteres; sin repetir el mismo texto (sin mirar
     * mayúsculas) para el mismo elemento; los más largos primero, luego por tipo y luego por orden alfabético.
     */
    fun construir(candidatos: List<EnlaceNarrativo>): List<EnlaceNarrativo> {
        val unicos = LinkedHashMap<String, EnlaceNarrativo>()
        candidatos.forEach { candidato ->
            val texto = candidato.texto.recortarComoJs()
            if (candidato.id == 0 || texto.length < 2) return@forEach
            val enlace = candidato.copy(texto = texto)
            val clave = "${enlace.tipo.ruta}:${enlace.id}:${texto.lowercase()}"
            val existente = unicos[clave]
            if (existente == null || texto.length > existente.texto.length) unicos[clave] = enlace
        }
        return unicos.values.sortedWith { a, b ->
            when {
                a.texto.length != b.texto.length -> b.texto.length - a.texto.length
                a.tipo.prioridad != b.tipo.prioridad -> a.tipo.prioridad - b.tipo.prioridad
                else -> comparador.compare(a.texto, b.texto)
            }
        }
    }

    /**
     * `findMatches`: las menciones de [texto], sin solaparse; entre las que se pisan gana la más larga, luego la de más
     * prioridad y luego la primera. Cuenta como mención la que no está pegada a letras, cifras o `_` y empieza por mayúscula.
     */
    fun buscar(texto: String, enlaces: List<EnlaceNarrativo>): List<Mencion> {
        if (texto.isEmpty() || enlaces.isEmpty()) return emptyList()
        val minusculas = texto.lowercase()
        val candidatas = mutableListOf<Mencion>()
        enlaces.forEach { enlace ->
            val buscado = enlace.texto.lowercase()
            var inicio = minusculas.indexOf(buscado)
            while (inicio != -1) {
                val fin = inicio + buscado.length
                if (fin <= texto.length && bordesValidos(texto, inicio, fin) && empiezaConMayuscula(texto.substring(inicio, fin))) {
                    candidatas.add(Mencion(inicio, fin, enlace))
                }
                inicio = minusculas.indexOf(buscado, inicio + 1)
            }
        }
        val elegidas = mutableListOf<Mencion>()
        candidatas
            .sortedWith(compareByDescending<Mencion> { it.fin - it.inicio }.thenBy { it.enlace.tipo.prioridad }.thenBy { it.inicio })
            .forEach { candidata -> if (elegidas.none { candidata.inicio < it.fin && it.inicio < candidata.fin }) elegidas.add(candidata) }
        return elegidas.sortedBy { it.inicio }
    }

    /**
     * Lo que guarda la web tras editar (`applyNarrativeEntityLinks` sobre el HTML del editor): en cada trozo de texto de
     * cada tramo (los saltos de línea lo parten), las menciones pasan a tramos propios con el color de palabra clave y
     * subrayados.
     */
    fun marcar(documento: DocumentoRtf, enlaces: List<EnlaceNarrativo>): DocumentoRtf {
        if (enlaces.isEmpty()) return documento
        return DocumentoRtf(documento.parrafos.map { parrafo ->
            Parrafo(parrafo.estilo, parrafo.tramos.flatMap { tramo -> marcarTramo(tramo, enlaces) })
        })
    }

    private fun marcarTramo(tramo: Tramo, enlaces: List<EnlaceNarrativo>): List<Tramo> {
        val clave = tramo.estilo.copy(color = COLOR_DE_PALABRA_CLAVE, subrayado = true)
        val resultado = mutableListOf<Tramo>()
        val trozos = tramo.texto.split('\n')
        trozos.forEachIndexed { i, trozo ->
            var cursor = 0
            buscar(trozo, enlaces).forEach { mencion ->
                if (mencion.inicio > cursor) resultado.add(Tramo(trozo.substring(cursor, mencion.inicio), tramo.estilo))
                resultado.add(Tramo(trozo.substring(mencion.inicio, mencion.fin), clave))
                cursor = mencion.fin
            }
            val resto = trozo.substring(cursor) + if (i < trozos.lastIndex) "\n" else ""
            if (resto.isNotEmpty()) resultado.add(Tramo(resto, tramo.estilo))
        }
        return juntar(resultado)
    }

    /** Junta los tramos seguidos con el mismo formato. */
    internal fun juntar(tramos: List<Tramo>): List<Tramo> {
        val juntos = mutableListOf<Tramo>()
        tramos.forEach { tramo ->
            val ultimo = juntos.lastOrNull()
            if (ultimo != null && ultimo.estilo == tramo.estilo) juntos[juntos.lastIndex] = Tramo(ultimo.texto + tramo.texto, ultimo.estilo)
            else juntos.add(tramo)
        }
        return juntos
    }

    private fun bordesValidos(texto: String, inicio: Int, fin: Int): Boolean =
        !esDePalabra(texto.getOrNull(inicio - 1)) && !esDePalabra(texto.getOrNull(fin))

    /** `[\p{L}\p{N}_]`. */
    private fun esDePalabra(c: Char?): Boolean = c != null && (c == '_' || Character.isLetter(c) || when (Character.getType(c).toByte()) {
        Character.DECIMAL_DIGIT_NUMBER, Character.LETTER_NUMBER, Character.OTHER_NUMBER -> true
        else -> false
    })

    /** La primera letra es mayúscula (y tiene minúscula). */
    private fun empiezaConMayuscula(mencion: String): Boolean {
        val letra = mencion.firstOrNull { Character.isLetter(it) }?.toString() ?: return false
        return letra == letra.uppercase() && letra != letra.lowercase()
    }
}
