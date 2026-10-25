package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.biblioteca.ultimoEstado
import java.net.URI

// Lo que decide el armazón del libro de la APK de Capacitor (book.component.ts en 5dc3120), sin red ni Compose: el
// índice con sus partes e interludios, cómo se nombra cada capítulo, si está en marcha y su wiki.

/** Una entrada del índice (`DisplayItem`): un capítulo, o una parte o un interludio con lo suyo dentro. */
sealed interface EntradaDelIndice {
    /** [deInterludio]: se abre como capítulo de interludio (`openInterludeChapter`). */
    data class DeCapitulo(val capitulo: Capitulo, val deInterludio: Boolean = false) : EntradaDelIndice

    data class Grupo(val tipo: TipoDeGrupo, val id: Int, val nombre: String, val entradas: List<EntradaDelIndice>) : EntradaDelIndice
}

enum class TipoDeGrupo { PARTE, INTERLUDIO }

/** Una acción de la hoja de Elementos (`entityToolbarActions`). */
/**
 * Los seis elementos narrativos (`entityToolbarActions` y la configuración de narrative-entity-placeholder): su nombre en
 * plural y en singular, sus rutas en la web y si el singular es femenino (para «creada» o «creado»).
 */
enum class Elemento(val etiqueta: String, val lista: String, val crear: String, val singular: String, val femenino: Boolean) {
    PERSONAJES("Personajes", "characters", "character", "personaje", false),
    ORGANIZACIONES("Organizaciones", "organizations", "organization", "organización", true),
    EVENTOS("Eventos", "events", "event", "evento", false),
    LOCALIZACIONES("Localizaciones", "locations", "location", "localización", true),
    CONCEPTOS("Conceptos", "concepts", "concept", "concepto", false),
    CITAS("Citas", "quotes", "quote", "cita", true),
    ;

    /** «Personaje», «Organización»… */
    val singularConMayuscula: String get() = singular.replaceFirstChar { it.uppercase() }

    /** «creado» o «creada», concordando con el singular (la web decía «Organización creado»). */
    fun participio(raiz: String): String = raiz + if (femenino) "a" else "o"
}

object IndiceDelLibro {
    /**
     * El índice, del último capítulo al primero (`generateDisplayList`): cada capítulo en su parte (si su orden cae en
     * ella; una parte con `ordenFinal` 0 llega hasta el final), cada interludio tras su capítulo o al final de su parte, y
     * los interludios sin sitio, al final. Los capítulos de un interludio, también del último al primero.
     *
     * TODO(clon): la web sacaba con `splice(-1, 1)` el último capítulo que quedara cuando faltaba un orden (un hueco en
     * la numeración); el resultado era el mismo orden, pero podía colgar un interludio del orden equivocado. Aquí cada
     * capítulo se busca por su orden.
     */
    fun entradas(libro: Libro): List<EntradaDelIndice> {
        val capitulos = libro.capitulos.associateBy { it.orden }
        val maximo = libro.capitulos.maxOfOrNull { it.orden } ?: 0
        // Una parte se coloca al encontrarla y se sigue llenando después: hasta el final va como [ParteEnCurso].
        val lista = mutableListOf<Any>()
        val partes = mutableMapOf<Int, MutableList<EntradaDelIndice>>()

        fun deInterludio(id: Int, nombre: String, delInterludio: List<Capitulo>) = EntradaDelIndice.Grupo(
            TipoDeGrupo.INTERLUDIO, id, nombre,
            delInterludio.sortedByDescending { it.orden }.map { EntradaDelIndice.DeCapitulo(it, deInterludio = true) },
        )

        for (orden in maximo downTo -1) {
            val capitulo = capitulos[orden]
            val parte = libro.partes.firstOrNull { (it.ordenFinal == 0 && orden >= it.ordenInicio) || (orden >= it.ordenInicio && orden <= it.ordenFinal) }
            if (parte != null) {
                if (parte.ordenFinal == orden) {
                    libro.interludios.firstOrNull { it.ordenParte == parte.id }?.let { lista += deInterludio(it.id, it.nombre, it.capitulos) }
                }
                val suyas = partes.getOrPut(parte.id) {
                    mutableListOf<EntradaDelIndice>().also { lista += ParteEnCurso(parte.id, parte.nombre, it) }
                }
                if (capitulo != null) {
                    libro.interludios.firstOrNull { it.ordenCapitulo == capitulo.orden }?.let { suyas += deInterludio(it.id, it.nombre, it.capitulos) }
                    suyas += EntradaDelIndice.DeCapitulo(capitulo)
                }
            } else if (capitulo != null) {
                lista += EntradaDelIndice.DeCapitulo(capitulo)
                libro.interludios.firstOrNull { it.ordenCapitulo == capitulo.orden }?.let { lista += deInterludio(it.id, it.nombre, it.capitulos) }
            }
        }
        libro.interludios.filter { it.ordenCapitulo == null && it.ordenParte == null }.forEach { lista += deInterludio(it.id, it.nombre, it.capitulos) }
        return lista.map { if (it is ParteEnCurso) EntradaDelIndice.Grupo(TipoDeGrupo.PARTE, it.id, it.nombre, it.entradas.toList()) else it as EntradaDelIndice }
    }

    private class ParteEnCurso(val id: Int, val nombre: String, val entradas: MutableList<EntradaDelIndice>)

    /** El número del círculo: el orden, salvo el 0, los negativos y el «Epílogo» final (`getChapterOrderLabel`). */
    fun etiquetaDeOrden(capitulo: Capitulo, maximo: Int): Int? =
        capitulo.orden.takeIf { it > 0 && !(it == maximo && capitulo.nombre == "Epílogo") }

    /** «Capítulo 3» se queda en «Capítulo»: el número ya va en el círculo (`getChapterTitle`). */
    fun titulo(capitulo: Capitulo): String = if (capitulo.nombre == "Capítulo ${capitulo.orden}") "Capítulo" else capitulo.nombre

    fun ordenMaximo(libro: Libro): Int = libro.capitulos.maxOfOrNull { it.orden } ?: 0

    /** Si el último estado del libro es «En marcha» (`isBookRunning`). */
    fun enMarcha(libro: Libro): Boolean = libro.obra.ultimoEstado == TipoDeEstado.EN_MARCHA

    /** La wiki, si la hay y no es la de por defecto (`google.es`; `hasBookWikiLink`). */
    fun wiki(libro: Libro): String? {
        val valor = libro.obra.wiki?.trim().orEmpty()
        if (valor.isEmpty()) return null
        val externa = if (Regex("^https?://", RegexOption.IGNORE_CASE).containsMatchIn(valor)) valor else "https://$valor"
        val anfitrion = runCatching { URI(externa).host }.getOrNull()
            ?: valor.replace(Regex("^https?://", RegexOption.IGNORE_CASE), "").substringBefore('/')
        return externa.takeIf { anfitrion.removePrefix("www.").lowercase() != "google.es" }
    }

    /** El nombre que se propone al crear una parte o un interludio («Parte 3», «Interludio 2»). */
    fun nombrePropuesto(tipo: TipoDeGrupo, libro: Libro): String =
        if (tipo == TipoDeGrupo.PARTE) "Parte ${libro.partes.size + 1}" else "Interludio ${libro.interludios.size + 1}"
}
