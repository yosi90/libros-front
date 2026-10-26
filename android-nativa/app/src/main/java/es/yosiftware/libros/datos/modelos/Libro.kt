package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.decimal
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONArray
import org.json.JSONObject

/**
 * El detalle de un libro (`GET /libros/{id}`, `BookDetail`): la obra y su narrativa (capítulos, partes, interludios y
 * escenas) y sus entidades. Sin universo o sin saga, el de la web: «Sin universo» y «Sin saga», con id 0
 * (`normalizeBook`).
 */
data class Libro(
    val obra: Obra,
    val capitulos: List<Capitulo>,
    val partes: List<Parte>,
    val interludios: List<Interludio>,
    val personajes: List<Personaje>,
    val metricasPersonajes: MetricasDePersonajes?,
    val localizaciones: List<Localizacion>,
    val conceptos: List<Concepto>,
    val organizaciones: List<Organizacion>,
    val eventos: List<Evento>,
    val citas: List<Cita>,
    val universo: Referencia,
    val saga: EnlaceDeSaga,
    val librosPrevios: List<LibroPrevio>,
    val sagasPrevias: List<SagaPrevia>,
    /** Lo propio de la persona en este libro (`Metricas`, desde la F2 y la F3 de «Estadísticas y altas»). */
    val metricas: MetricasDelLibro? = null,
) {
    val id: Int get() = obra.id
    val nombre: String get() = obra.nombre

    /** Todos los capítulos, los del libro y los de sus interludios, por su orden (`getAllBookChapters`). */
    val todosLosCapitulos: List<Capitulo> get() = (capitulos + interludios.flatMap { it.capitulos }).sortedBy { it.orden }

    companion object {
        fun de(json: JSONObject) = Libro(
            obra = Obra.de(json),
            capitulos = json.lista("Capitulos", Capitulo::de),
            partes = json.lista("Partes", Parte::de),
            interludios = json.lista("Interludios", Interludio::de),
            personajes = json.lista("Personajes", Personaje::de),
            metricasPersonajes = json.objeto("MetricasPersonajes")?.let(MetricasDePersonajes::de),
            localizaciones = json.lista("Localizaciones", Localizacion::de),
            conceptos = json.lista("Conceptos", Concepto::de),
            organizaciones = json.lista("Organizaciones", Organizacion::de),
            eventos = json.lista("Eventos", Evento::de),
            citas = json.lista("Citas", Cita::de),
            universo = json.objeto("Universo")?.let(Referencia::de) ?: Referencia(0, "Sin universo"),
            saga = json.objeto("Saga")?.let(EnlaceDeSaga::de) ?: EnlaceDeSaga(0, "Sin saga", null),
            librosPrevios = json.lista("LibrosPrevios", LibroPrevio::de),
            sagasPrevias = json.lista("SagasPrevias", SagaPrevia::de),
            metricas = json.objeto("Metricas")?.let(MetricasDelLibro::de),
        )
    }
}

/** Una sección de antología abierta como libro (`GET /antologias/secciones/{id}`, `AnthologySectionDetail`). */
data class SeccionDeAntologia(val antologia: Referencia, val libro: Libro, val paginaInicio: Double?, val paginaFinal: Double?) {
    companion object {
        // La ruta viene del contrato antiguo y en QA manda los ids como texto: se leen como número.
        fun de(json: JSONObject) = SeccionDeAntologia(
            antologia = json.objeto("Antologia")?.let(Referencia::de) ?: Referencia(0, ""),
            libro = Libro.de(json.objeto("Libro") ?: JSONObject()),
            paginaInicio = json.decimal("PaginaInicio"),
            paginaFinal = json.decimal("PaginaFinal"),
        )
    }
}

/** Un libro anterior de la misma saga o universo (`BookPreviousSummary`). */
data class LibroPrevio(val id: Int, val nombre: String, val orden: Double?) {
    companion object {
        fun de(json: JSONObject) = LibroPrevio(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty(), json.decimal("Orden"))
    }
}

/** Una saga anterior, con sus libros y sagas previas (`PreviousSaga`). */
data class SagaPrevia(
    val id: Int,
    val nombre: String,
    val subtitulo: String?,
    val autores: List<Autor>,
    val librosPrevios: List<LibroPrevio>,
    val sagasPrevias: List<SagaPrevia>,
) {
    companion object {
        fun de(json: JSONObject): SagaPrevia = SagaPrevia(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            subtitulo = json.texto("Subtitulo"),
            autores = json.lista("Autores", Autor::de),
            librosPrevios = json.lista("LibrosPrevios", LibroPrevio::de),
            sagasPrevias = json.lista("SagasPrevias", SagaPrevia::de),
        )
    }
}

/** Un capítulo del libro o de un interludio (`Chapter` e `InterludeChapter`), con sus escenas. */
data class Capitulo(
    val id: Int,
    val nombre: String,
    val orden: Int,
    val pagina: Int,
    val paginaFinal: Int?,
    val esInterludio: Boolean,
    val idInterludio: Int?,
    val escenas: List<Escena>,
) {
    companion object {
        fun de(json: JSONObject) = Capitulo(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            orden = json.entero("Orden") ?: 0,
            pagina = json.entero("Pagina") ?: 0,
            paginaFinal = json.entero("PaginaFinal"),
            esInterludio = json.booleano("EsInterludio") ?: false,
            idInterludio = json.entero("Id_Interludio"),
            escenas = json.lista("Escenas", Escena::de),
        )
    }
}

/** Una parte: agrupa los capítulos de [ordenInicio] a [ordenFinal] (`Part`: `Orden_inicio` y `Orden_final`). */
data class Parte(val id: Int, val nombre: String, val ordenInicio: Int, val ordenFinal: Int, val pagina: Int) {
    companion object {
        fun de(json: JSONObject) = Parte(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            ordenInicio = json.entero("Orden_inicio") ?: 0,
            ordenFinal = json.entero("Orden_final") ?: 0,
            pagina = json.entero("Pagina") ?: 0,
        )
    }
}

/** Un interludio, tras el capítulo [ordenCapitulo] o la parte [ordenParte] (`Orden_cap`, `Orden_part`). */
data class Interludio(
    val id: Int,
    val nombre: String,
    val ordenCapitulo: Int?,
    val ordenParte: Int?,
    val pagina: Int,
    val capitulos: List<Capitulo>,
) {
    companion object {
        fun de(json: JSONObject) = Interludio(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            ordenCapitulo = json.entero("Orden_cap"),
            ordenParte = json.entero("Orden_part"),
            pagina = json.entero("Pagina") ?: 0,
            capitulos = json.lista("Capitulos", Capitulo::de),
        )
    }
}

/** Un personaje en una escena: presente o solo nombrado (`SceneCharacterDetail`). */
data class PersonajeEnEscena(val id: Int, val nombrado: Boolean)

/**
 * Una escena (`Scene`). `Personajes` llega como ids o como `{ Id, Nombrado }`, y el detalle en `PersonajesDetalle`;
 * aquí, [personajes] es el detalle si lo hay (los ids sueltos, presentes). La localización llega como ficha
 * (`Localizacion`) o como id (`Id_Localizacion`).
 * TODO(contrato): `Localizacion`, `Valida` y `Eliminable` los lee la web, pero `Scene` del OpenAPI no los tiene.
 */
data class Escena(
    val id: Int,
    val nombre: String,
    /** Su texto, en RTF. */
    val descripcion: String,
    val idLocalizacion: Int?,
    val localizacion: Localizacion?,
    val personajes: List<PersonajeEnEscena>,
    val valida: Boolean?,
    val eliminable: Boolean?,
) {
    companion object {
        fun de(json: JSONObject): Escena {
            val localizacion = json.objeto("Localizacion")?.let(Localizacion::de)
            val detalle = (json.opt("PersonajesDetalle") as? JSONArray)?.let(::personajesDe)
            return Escena(
                id = json.entero("Id") ?: 0,
                nombre = json.texto("Nombre").orEmpty(),
                descripcion = json.texto("Descripcion").orEmpty(),
                idLocalizacion = json.entero("Id_Localizacion") ?: localizacion?.id,
                localizacion = localizacion,
                personajes = detalle ?: (json.opt("Personajes") as? JSONArray)?.let(::personajesDe).orEmpty(),
                valida = json.booleano("Valida"),
                eliminable = json.booleano("Eliminable"),
            )
        }

        private fun personajesDe(lista: JSONArray): List<PersonajeEnEscena> = (0 until lista.length()).mapNotNull { i ->
            when (val valor = lista.opt(i)) {
                is JSONObject -> valor.entero("Id")?.let { PersonajeEnEscena(it, valor.booleano("Nombrado") ?: false) }
                is Number -> PersonajeEnEscena(valor.toInt(), false)
                else -> null
            }
        }
    }
}

/** `Metricas` del libro: el ritmo de la persona en él y su valoración (`ReadingPaceBook` y `RatingOwn` de la web). */
data class MetricasDelLibro(val ritmo: RitmoDelLibro?, val valoracion: ValoracionPropia?) {
    companion object {
        fun de(json: JSONObject) = MetricasDelLibro(
            ritmo = json.objeto("Ritmo")?.let(RitmoDelLibro::de),
            valoracion = json.objeto("Valoracion")?.let(ValoracionPropia::de),
        )
    }
}

/** El ritmo propio en un libro: `null` hasta que se registran capítulos con fecha. */
data class RitmoDelLibro(
    val desde: String?,
    val diasActivos: Int,
    val paginasPorDia: Double,
    /** El día con más páginas («2026-10-25») y cuántas. */
    val mejorDia: Pair<String, Int>?,
    val mediaPersonalPorDia: Double?,
    /** La página más alta al final de cada día con lectura. */
    val curva: List<Pair<String, Int>>,
) {
    companion object {
        fun de(json: JSONObject) = RitmoDelLibro(
            desde = json.texto("Desde"),
            diasActivos = json.entero("DiasActivos") ?: 0,
            paginasPorDia = json.decimal("PaginasPorDia") ?: 0.0,
            mejorDia = json.objeto("MejorDia")?.let { dia -> dia.texto("Fecha")?.let { it to (dia.entero("Paginas") ?: 0) } },
            mediaPersonalPorDia = json.decimal("MediaPersonalPorDia"),
            curva = json.lista("Curva") { punto -> (punto.texto("Fecha") ?: "") to (punto.entero("Pagina") ?: 0) }.filter { it.first.isNotEmpty() },
        )
    }
}

/** La puntuación propia y cuándo se puntuó y reseñó por última vez (`null` en lo de antes de la F3). */
data class ValoracionPropia(val puntuacion: Int?, val fechaPuntuacion: String?, val fechaResena: String?) {
    companion object {
        fun de(json: JSONObject) = ValoracionPropia(json.entero("Puntuacion"), json.texto("FechaPuntuacion"), json.texto("FechaResena"))
    }
}
