package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.decimal
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.ids
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.listaDe
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.json.textoDe
import es.yosiftware.libros.datos.json.textos
import org.json.JSONObject

/**
 * Un libro o una antología en una lista: el catálogo (`CatalogItem`), la colección (`CollectionItem`, con su progreso y
 * sus fechas) y las fichas de universos y sagas (`BookSummary`, `Anthology`). Lo que una ruta no manda se queda vacío.
 */
data class Obra(
    /** `libro` o `antologia`; vacío si la ruta no lo dice. */
    val tipo: String,
    val id: Int,
    val nombre: String,
    val portada: String?,
    val autores: List<Autor>,
    val estados: List<EstadoDeLectura>,
    val isbn: String? = null,
    val ediciones: List<Edicion> = emptyList(),
    val sinopsis: String? = null,
    val paginas: Int? = null,
    val fechaPublicacion: String? = null,
    val idiomasDisponibles: List<Opcion> = emptyList(),
    val estilos: List<Opcion> = emptyList(),
    val estilo: String? = null,
    val puntuacion: Int? = null,
    val resena: String? = null,
    val resenaOculta: Boolean = false,
    val puedeAbrirNarrativa: Boolean? = null,
    val narrativaPersonalDisponible: Boolean? = null,
    /** El orden en su saga o universo (puede ser decimal). */
    val orden: Double? = null,
    val wiki: String? = null,
    val porcentajeCompletado: Double? = null,
    val fechaAgregado: String? = null,
    val fechaActualizacion: String? = null,
    /** De una antología en la colección: el progreso de cada sección. */
    val seccionesProgreso: List<ProgresoDeSeccion> = emptyList(),
    /**
     * De una antología (`/antologias/{id}`): sus secciones (`Secciones` o `Libros`), con sus páginas.
     * TODO(contrato): `Anthology` del OpenAPI solo tiene `Libros`; la web lee antes `Secciones`.
     */
    val secciones: List<Obra> = emptyList(),
    /** De una sección de antología: su primera y su última página dentro de ella. */
    val paginaInicio: Double? = null,
    val paginaFinal: Double? = null,
) {
    val esAntologia: Boolean get() = tipo == ANTOLOGIA

    /** El último estado del histórico (`getLatestStatus`). */
    val estadoActual: EstadoDeLectura? get() = estados.lastOrNull()

    companion object {
        const val LIBRO = "libro"
        const val ANTOLOGIA = "antologia"

        fun de(json: JSONObject): Obra = Obra(
            tipo = json.texto("Tipo").orEmpty(),
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            portada = json.texto("Portada"),
            autores = json.lista("Autores", Autor::de),
            estados = json.lista("Estados", EstadoDeLectura::de),
            isbn = json.texto("ISBN"),
            ediciones = json.lista("Ediciones", Edicion::de),
            sinopsis = json.texto("Sinopsis"),
            paginas = json.entero("Paginas"),
            fechaPublicacion = json.texto("FechaPublicacion"),
            idiomasDisponibles = Opcion.lista(json, "IdiomasDisponibles"),
            estilos = Opcion.lista(json, "Estilos"),
            estilo = json.texto("Estilo"),
            puntuacion = json.entero("Puntuacion"),
            resena = json.texto("Resena"),
            resenaOculta = json.booleano("ResenaOculta") ?: false,
            puedeAbrirNarrativa = json.booleano("PuedeAbrirNarrativa"),
            narrativaPersonalDisponible = json.booleano("NarrativaPersonalDisponible"),
            orden = json.decimal("Orden"),
            wiki = json.texto("Wiki"),
            porcentajeCompletado = json.decimal("PorcentajeCompletado"),
            fechaAgregado = json.texto("FechaAgregado"),
            fechaActualizacion = json.texto("FechaActualizacion"),
            seccionesProgreso = json.lista("SeccionesProgreso", ProgresoDeSeccion::de),
            secciones = json.listaDe("Secciones", "Libros", leer = Obra::de),
            paginaInicio = json.decimal("PaginaInicio"),
            paginaFinal = json.decimal("PaginaFinal"),
        )
    }
}

/** El progreso de una sección de una antología de la colección (`AnthologySectionProgress`). */
data class ProgresoDeSeccion(
    val libroId: Int,
    val nombre: String,
    val portada: String?,
    val paginaInicio: Double?,
    val paginaFinal: Double?,
    val porcentajeCompletado: Double?,
) {
    companion object {
        fun de(json: JSONObject) = ProgresoDeSeccion(
            libroId = json.entero("LibroId") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            portada = json.texto("Portada"),
            paginaInicio = json.decimal("PaginaInicio"),
            paginaFinal = json.decimal("PaginaFinal"),
            porcentajeCompletado = json.decimal("PorcentajeCompletado"),
        )
    }
}

/** Otra saga de la cadena (`SagaLink`), o la saga de una antología. */
data class EnlaceDeSaga(val id: Int, val nombre: String, val subtitulo: String?) {
    companion object {
        fun de(json: JSONObject) = EnlaceDeSaga(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty(), json.texto("Subtitulo"))
    }
}

/** Las sagas anteriores y siguientes (`SagaChain`): la familia y el orden de lectura los calcula la API. */
data class CadenaDeSagas(
    val previasIds: List<Int> = emptyList(),
    val previas: List<EnlaceDeSaga> = emptyList(),
    val siguientes: List<EnlaceDeSaga> = emptyList(),
    val familiaSagaId: Int? = null,
    val ordenLectura: Int? = null,
) {
    companion object {
        fun de(json: JSONObject) = CadenaDeSagas(
            previasIds = json.ids("SagasPreviasIds"),
            previas = json.lista("SagasPrevias", EnlaceDeSaga::de),
            siguientes = json.lista("SagasSiguientes", EnlaceDeSaga::de),
            familiaSagaId = json.entero("FamiliaSagaId"),
            ordenLectura = json.entero("OrdenLectura"),
        )
    }
}

/**
 * Una saga: la del catálogo (`SagaCatalogEntity`, `SagaCatalogDetail`), la de la colección (`CollectionSaga`) y la
 * ficha de `/sagas/{id}`, con sus libros y antologías si la ruta los manda.
 * TODO(contrato): la web tipa `/catalogo/sagas` como `Saga` (con libros) y el OpenAPI como `SagaCatalogEntity`.
 */
data class Saga(
    val id: Int,
    val nombre: String,
    val subtitulo: String?,
    val universoId: Int?,
    val universo: Referencia?,
    val autores: List<Autor>,
    val cadena: CadenaDeSagas,
    val libros: List<Obra>,
    val antologias: List<Obra>,
    val orden: Double? = null,
) {
    companion object {
        fun de(json: JSONObject): Saga {
            val universo = json.objeto("Universo")?.let(Referencia::de)
            return Saga(
                id = json.entero("Id") ?: 0,
                nombre = json.texto("Nombre").orEmpty(),
                subtitulo = json.texto("Subtitulo"),
                universoId = json.entero("UniversoId") ?: universo?.id,
                universo = universo,
                autores = json.lista("Autores", Autor::de),
                cadena = CadenaDeSagas.de(json),
                libros = json.lista("Libros", Obra::de),
                antologias = json.lista("Antologias", Obra::de),
                orden = json.decimal("Orden"),
            )
        }
    }
}

/** Un universo: del catálogo (solo `Id` y `Nombre`), de la colección (`CollectionUniverse`) o de `/universos/{id}`. */
data class Universo(
    val id: Int,
    val nombre: String,
    val autores: List<Autor>,
    val sagas: List<Saga>,
    val libros: List<Obra>,
    val antologias: List<Obra>,
) {
    companion object {
        fun de(json: JSONObject) = Universo(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            autores = json.lista("Autores", Autor::de),
            sagas = json.lista("Sagas", Saga::de),
            libros = json.lista("Libros", Obra::de),
            antologias = json.lista("Antologias", Obra::de),
        )
    }
}

/**
 * La ficha pública de un libro o una antología del catálogo (`CatalogPublicDetail`): la obra, lo de la persona
 * ([miColeccion]), sus estadísticas y las reseñas visibles. De una antología, además, su universo y su saga.
 * TODO(contrato): las reseñas (`Resenas`, `ResenasPublicas` o `ResenasVisibles`, como la web) no están en
 * `CatalogPublicDetail` del OpenAPI.
 */
data class DetallePublico(
    val obra: Obra,
    val miColeccion: MiColeccion?,
    val resenas: List<ResenaPublica>,
    val estadisticas: EstadisticasPublicas,
    val universo: Referencia? = null,
    val saga: EnlaceDeSaga? = null,
) {
    companion object {
        fun de(json: JSONObject) = DetallePublico(
            obra = Obra.de(json),
            miColeccion = json.objeto("MiColeccion")?.let(MiColeccion::de),
            resenas = json.listaDe("Resenas", "ResenasPublicas", "ResenasVisibles", leer = ResenaPublica::de),
            estadisticas = EstadisticasPublicas.de(json.objeto("Estadisticas") ?: JSONObject()),
            universo = json.objeto("Universo")?.let(Referencia::de),
            saga = json.objeto("Saga")?.let(EnlaceDeSaga::de),
        )
    }
}

/** Lo de la persona en una obra del catálogo (`PublicDetailOwnCollection`). */
data class MiColeccion(
    val enBiblioteca: Boolean,
    val edicionesIds: List<Int>,
    val estadoActual: EstadoDeLectura?,
    val estados: List<EstadoDeLectura>,
    val puntuacion: Int?,
    val resena: String?,
    val resenaOculta: Boolean,
    val puedeAbrirNarrativa: Boolean?,
    val narrativaPersonalDisponible: Boolean?,
    val fechaAgregado: String?,
    val fechaActualizacion: String?,
) {
    companion object {
        fun de(json: JSONObject) = MiColeccion(
            enBiblioteca = json.booleano("EnBiblioteca") ?: false,
            edicionesIds = json.ids("EdicionesIds"),
            estadoActual = json.objeto("EstadoActual")?.let(EstadoDeLectura::de),
            estados = json.lista("Estados", EstadoDeLectura::de),
            puntuacion = json.entero("Puntuacion"),
            resena = json.texto("Resena"),
            resenaOculta = json.booleano("ResenaOculta") ?: false,
            puedeAbrirNarrativa = json.booleano("PuedeAbrirNarrativa"),
            narrativaPersonalDisponible = json.booleano("NarrativaPersonalDisponible"),
            fechaAgregado = json.texto("FechaAgregado"),
            fechaActualizacion = json.texto("FechaActualizacion"),
        )
    }
}

/** Una reseña visible en la ficha pública (`CatalogPublicReview`). */
data class ResenaPublica(
    val id: Int?,
    val usuarioId: Int?,
    val usuario: Opcion?,
    val puntuacion: Int?,
    val resena: String?,
    val resenaOculta: Boolean,
    val fecha: String?,
    val fechaCreacion: String?,
    /** Si es de la persona (`EsMia` o `EsPropia`). */
    val esMia: Boolean,
) {
    companion object {
        fun de(json: JSONObject): ResenaPublica {
            val usuario = json.objeto("Usuario")?.let(Opcion::de)
            return ResenaPublica(
                id = json.entero("Id"),
                usuarioId = json.entero("UsuarioId") ?: usuario?.id,
                usuario = usuario,
                puntuacion = json.entero("Puntuacion"),
                resena = json.texto("Resena"),
                resenaOculta = json.booleano("ResenaOculta") ?: false,
                fecha = json.texto("Fecha"),
                fechaCreacion = json.texto("FechaCreacion"),
                esMia = json.booleano("EsMia") == true || json.booleano("EsPropia") == true,
            )
        }
    }
}

/** El puesto de una obra en un ranking (`RankingMetric`). */
data class MetricaDeRanking(val valor: Double?, val ranking: Int, val totalElementos: Int, val percentil: Double?) {
    companion object {
        fun de(json: JSONObject) = MetricaDeRanking(
            valor = json.decimal("Valor"),
            ranking = json.entero("Ranking") ?: 0,
            totalElementos = json.entero("TotalItems") ?: 0,
            percentil = json.decimal("Percentil"),
        )
    }
}

/** La popularidad de una obra en un idioma o un estilo (`MetadataPopularity`). */
data class PopularidadDeMetadato(val id: Int, val nombre: String, val codigo: String?, val bibliotecas: MetricaDeRanking?) {
    companion object {
        fun de(json: JSONObject) = PopularidadDeMetadato(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            codigo = json.texto("Codigo"),
            bibliotecas = json.objeto("Bibliotecas")?.let(MetricaDeRanking::de),
        )
    }
}

/** Cuántas personas tienen cada estado de una obra (`ReadingStateDistributionRow`). */
data class RepartoDeEstado(val estadoId: Int, val estado: String?, val total: Int, val porcentaje: Double?) {
    companion object {
        fun de(json: JSONObject) = RepartoDeEstado(
            estadoId = json.entero("EstadoId") ?: 0,
            estado = json.texto("Estado"),
            total = json.entero("Total") ?: 0,
            porcentaje = json.decimal("Porcentaje"),
        )
    }
}

/** Las estadísticas públicas de una obra del catálogo (`PublicCatalogStats`). */
data class EstadisticasPublicas(
    val usuariosEnBiblioteca: Int,
    val puntuacionMedia: Double?,
    val totalPuntuaciones: Int,
    /** Cuántas puntuaciones hay de cada valor, de 1 a 5. */
    val repartoDePuntuaciones: Map<Int, Int>,
    val totalConEstado: Int?,
    val totalEnEspera: Int?,
    val totalLeidos: Int,
    val totalEnMarcha: Int,
    val totalQuieroLeer: Int,
    val totalPorComprar: Int,
    val totalDescartados: Int,
    val repartoDeEstados: List<RepartoDeEstado>,
    val primeraFechaAgregado: String?,
    val ultimaFechaAgregado: String?,
    val ultimaFechaActualizacionBiblioteca: String?,
    val ultimoCambioEstado: String?,
    val popularidadEnBibliotecas: MetricaDeRanking?,
    val popularidadPorPuntuacion: MetricaDeRanking?,
    val popularidadPorIdioma: List<PopularidadDeMetadato>,
    val popularidadPorEstilo: List<PopularidadDeMetadato>,
) {
    companion object {
        fun de(json: JSONObject): EstadisticasPublicas {
            val actividad = json.objeto("ActividadAgregada")
            val popularidad = json.objeto("Popularidad")
            return EstadisticasPublicas(
                usuariosEnBiblioteca = json.entero("UsuariosEnBiblioteca") ?: 0,
                puntuacionMedia = json.decimal("PuntuacionMedia"),
                totalPuntuaciones = json.entero("TotalPuntuaciones") ?: 0,
                repartoDePuntuaciones = json.lista("DistribucionPuntuaciones") { (it.entero("Puntuacion") ?: 0) to (it.entero("Total") ?: 0) }.toMap(),
                totalConEstado = json.entero("TotalConEstado"),
                totalEnEspera = json.entero("TotalEnEspera"),
                totalLeidos = json.entero("TotalLeidos") ?: 0,
                totalEnMarcha = json.entero("TotalEnMarcha") ?: 0,
                totalQuieroLeer = json.entero("TotalQuieroLeer") ?: 0,
                totalPorComprar = json.entero("TotalPorComprar") ?: 0,
                totalDescartados = json.entero("TotalDescartados") ?: 0,
                repartoDeEstados = json.lista("DistribucionEstados", RepartoDeEstado::de),
                primeraFechaAgregado = actividad?.texto("PrimeraFechaAgregado"),
                ultimaFechaAgregado = actividad?.texto("UltimaFechaAgregado"),
                ultimaFechaActualizacionBiblioteca = actividad?.texto("UltimaFechaActualizacionBiblioteca"),
                ultimoCambioEstado = actividad?.texto("UltimoCambioEstado"),
                popularidadEnBibliotecas = popularidad?.objeto("Bibliotecas")?.let(MetricaDeRanking::de),
                popularidadPorPuntuacion = popularidad?.objeto("Puntuacion")?.let(MetricaDeRanking::de),
                popularidadPorIdioma = json.lista("PopularidadPorIdioma", PopularidadDeMetadato::de),
                popularidadPorEstilo = json.lista("PopularidadPorEstilo", PopularidadDeMetadato::de),
            )
        }
    }
}

/** Lo que Google Books sabe de un ISBN, para la petición de catálogo (`GoogleBooksIsbnMetadata`). */
data class DatosDeGoogleBooks(
    val isbn: String?,
    val nombre: String?,
    /** La portada como data URL PNG (base64), o vacía. */
    val portada: String?,
    val portadaUrl: String?,
    val autores: List<String>,
    val estilos: List<String>,
    val paginas: Int?,
    val idioma: String?,
    val fechaPublicacion: String?,
    val sinopsis: String?,
) {
    companion object {
        fun de(json: JSONObject) = DatosDeGoogleBooks(
            isbn = json.texto("ISBN"),
            nombre = json.texto("Nombre"),
            portada = json.textoDe("Portada"),
            portadaUrl = json.textoDe("PortadaUrl"),
            autores = json.textos("Autores"),
            estilos = json.textos("Estilos"),
            paginas = json.entero("Paginas"),
            idioma = json.texto("Idioma"),
            fechaPublicacion = json.texto("FechaPublicacion"),
            sinopsis = json.texto("Sinopsis"),
        )
    }
}
