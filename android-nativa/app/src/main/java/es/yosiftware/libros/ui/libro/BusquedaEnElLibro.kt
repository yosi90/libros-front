package es.yosiftware.libros.ui.libro

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Entrada
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.rtfATexto
import java.text.Collator
import java.text.Normalizer
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// La búsqueda avanzada dentro del libro (src/app/shared/book-advanced-search.ts en 5dc3120): todo se busca en el libro
// ya cargado, sin red. Primero las coincidencias exactas; si no hay ninguna, las aproximadas (Levenshtein), dos como
// mucho por categoría.

/** Las categorías, en su orden, con el elemento al que lleva un resultado (los capítulos, a su capítulo). */
enum class CategoriaDeBusqueda(val etiqueta: String, val elemento: Elemento?) {
    CAPITULOS("Capítulos", null),
    PERSONAJES("Personajes", Elemento.PERSONAJES),
    ORGANIZACIONES("Organizaciones", Elemento.ORGANIZACIONES),
    EVENTOS("Eventos", Elemento.EVENTOS),
    LOCALIZACIONES("Localizaciones", Elemento.LOCALIZACIONES),
    CONCEPTOS("Conceptos", Elemento.CONCEPTOS),
    CITAS("Citas", Elemento.CITAS),
}

/** Dónde coincide: el campo, su texto, si es exacta y, en las aproximadas, la distancia (menos es mejor). */
data class Coincidencia(val campo: String, val fragmento: String, val exacta: Boolean, val puntos: Int)

data class ResultadoDeBusqueda(
    val id: Int,
    val categoria: CategoriaDeBusqueda,
    val titulo: String,
    val subtitulo: String,
    /** Lo que se abre al tocarlo. */
    val destino: VistaDelLibro,
    val coincidencias: List<Coincidencia>,
    val aproximado: Boolean,
)

data class GrupoDeResultados(val categoria: CategoriaDeBusqueda, val activa: Boolean, val resultados: List<ResultadoDeBusqueda>) {
    val total: Int get() = resultados.size
}

enum class ModoDeBusqueda { VACIA, EXACTA, APROXIMADA, NINGUNA }

data class Busqueda(val modo: ModoDeBusqueda, val grupos: List<GrupoDeResultados>) {
    val total: Int get() = grupos.sumOf { it.total }
    val visibles: List<GrupoDeResultados> get() = grupos.filter { it.total > 0 }
}

/** Un campo del índice, con su texto ya normalizado y sin espacios. */
internal data class CampoIndexado(val etiqueta: String, val valor: String, val normalizado: String, val compacto: String)

internal data class Indexado(
    val id: Int,
    val categoria: CategoriaDeBusqueda,
    val titulo: String,
    val subtitulo: String,
    val destino: VistaDelLibro,
    val campos: List<CampoIndexado>,
)

object BusquedaEnElLibro {
    private val marcas = Regex("[\\u0300-\\u036f]")
    private val noAlfanumerico = Regex("[^\\p{L}\\p{N}]+")
    private val espacios = Regex("\\s+")
    /** Los campos en los que se busca de forma aproximada aunque la palabra buscada sea corta. */
    private val camposDeNombre = setOf("Nombre", "Apodo", "Personaje", "Personajes", "Localización", "Localizaciones")

    fun vacia(activas: Set<CategoriaDeBusqueda> = CategoriaDeBusqueda.entries.toSet()): Busqueda =
        Busqueda(ModoDeBusqueda.VACIA, CategoriaDeBusqueda.entries.map { GrupoDeResultados(it, it in activas, emptyList()) })

    fun buscar(libro: Libro, consulta: String, activas: Set<CategoriaDeBusqueda> = CategoriaDeBusqueda.entries.toSet()): Busqueda =
        buscar(indice(libro), consulta, activas)

    /** `searchBook`, con el índice ya hecho (se rehace solo si cambia el libro). */
    internal fun buscar(indice: List<Indexado>, consulta: String, activas: Set<CategoriaDeBusqueda>): Busqueda {
        val buscada = normalizar(consulta)
        if (buscada.isEmpty()) return vacia(activas)
        val elementos = indice.filter { it.categoria in activas }
        val exactos = elementos.mapNotNull { resultado(it, exactas(it, buscada)) }
        if (exactos.isNotEmpty()) return agrupar(activas, exactos, ModoDeBusqueda.EXACTA)
        val aproximados = elementos.mapNotNull { resultado(it, aproximadas(it, buscada), aproximado = true) }
            .sortedWith(compareBy<ResultadoDeBusqueda> { it.coincidencias.firstOrNull()?.puntos ?: Int.MAX_VALUE }.thenComparator { a, b -> comparador.compare(a.titulo, b.titulo) })
        val limitados = CategoriaDeBusqueda.entries.flatMap { categoria -> aproximados.filter { it.categoria == categoria }.take(2) }
        return agrupar(activas, limitados, if (limitados.isNotEmpty()) ModoDeBusqueda.APROXIMADA else ModoDeBusqueda.NINGUNA)
    }

    /** `normalizeSearchText`: sin tildes, en minúsculas y solo letras y números, separados por un espacio. */
    fun normalizar(valor: String): String = Normalizer.normalize(valor, Normalizer.Form.NFD)
        .replace(marcas, "")
        .lowercase()
        .replace(noAlfanumerico, " ")
        .replace(espacios, " ")
        .trim()

    private val comparador: Collator = Collator.getInstance(Locale.forLanguageTag("es"))

    private fun agrupar(activas: Set<CategoriaDeBusqueda>, resultados: List<ResultadoDeBusqueda>, modo: ModoDeBusqueda) =
        Busqueda(modo, CategoriaDeBusqueda.entries.map { categoria -> GrupoDeResultados(categoria, categoria in activas, resultados.filter { it.categoria == categoria }) })

    private fun resultado(elemento: Indexado, coincidencias: List<Coincidencia>, aproximado: Boolean = false): ResultadoDeBusqueda? =
        if (coincidencias.isEmpty()) null
        else ResultadoDeBusqueda(elemento.id, elemento.categoria, elemento.titulo, elemento.subtitulo, elemento.destino, coincidencias, aproximado)

    // --- Las coincidencias. ---

    private fun exactas(elemento: Indexado, buscada: String): List<Coincidencia> {
        val palabras = buscada.split(' ').filter(String::isNotEmpty)
        val compacta = compactar(buscada)
        return elemento.campos.filter { campo ->
            campo.normalizado.contains(buscada) ||
                (compacta.length >= 5 && campo.compacto.contains(compacta)) ||
                palabras.all { campo.normalizado.contains(it) || (it.length >= 5 && campo.compacto.contains(it)) }
        }.map { Coincidencia(it.etiqueta, it.valor, exacta = true, puntos = 0) }
    }

    private fun aproximadas(elemento: Indexado, buscada: String): List<Coincidencia> {
        val palabras = buscada.split(' ').filter(String::isNotEmpty)
        if (palabras.isEmpty()) return emptyList()
        val masCorta = palabras.minOf { it.length }
        return elemento.campos
            .filter { masCorta > 3 || it.etiqueta in camposDeNombre }
            .mapNotNull { campo -> puntosDelCampo(palabras, campo.normalizado)?.let { Coincidencia(campo.etiqueta, campo.valor, exacta = false, puntos = it) } }
            .sortedBy { it.puntos }
    }

    private fun puntosDelCampo(palabras: List<String>, normalizado: String): Int? {
        val compacto = compactar(normalizado)
        val delCampo = normalizado.split(' ').filter(String::isNotEmpty)
        if (delCampo.isEmpty()) return null
        var total = 0
        for (palabra in palabras) {
            val tolerancia = tolerancia(palabra)
            val mejor = delCampo.minOf { distanciaCandidata(palabra, it, tolerancia) }
            val compacta = if (palabra.length >= 5) mejorDistanciaCompacta(palabra, compacto, tolerancia) else Int.MAX_VALUE
            val distancia = minOf(mejor, compacta)
            if (distancia > tolerancia) return null
            total += distancia
        }
        return total
    }

    private fun distanciaCandidata(palabra: String, candidata: String, tolerancia: Int): Int = when {
        kotlin.math.abs(palabra.length - candidata.length) > tolerancia -> Int.MAX_VALUE
        palabra.length <= 3 && candidata.length > palabra.length + 1 -> Int.MAX_VALUE
        palabra.length <= 4 && candidata.firstOrNull() != palabra.firstOrNull() -> Int.MAX_VALUE
        else -> levenshtein(palabra, candidata)
    }

    private fun mejorDistanciaCompacta(palabra: String, compacto: String, tolerancia: Int): Int {
        if (compacto.isEmpty()) return Int.MAX_VALUE
        if (compacto.contains(palabra)) return 0
        val minima = maxOf(1, palabra.length - tolerancia)
        val maxima = minOf(compacto.length, palabra.length + tolerancia)
        var mejor = Int.MAX_VALUE
        for (inicio in compacto.indices) {
            var largo = minima
            while (largo <= maxima && inicio + largo <= compacto.length) {
                val distancia = levenshtein(palabra, compacto.substring(inicio, inicio + largo))
                if (distancia < mejor) {
                    mejor = distancia
                    if (mejor == 0) return 0
                }
                largo++
            }
        }
        return mejor
    }

    private fun tolerancia(palabra: String): Int = when {
        palabra.length <= 2 -> 0
        palabra.length <= 7 -> 1
        else -> 2
    }

    internal fun levenshtein(a: String, b: String): Int {
        var anterior = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            val fila = IntArray(b.length + 1)
            fila[0] = i
            for (j in 1..b.length) {
                fila[j] = minOf(fila[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + if (a[i - 1] == b[j - 1]) 0 else 1)
            }
            anterior = fila
        }
        return anterior[b.length]
    }

    // --- El índice. ---

    internal fun indice(libro: Libro): List<Indexado> =
        capitulos(libro) + CategoriaDeBusqueda.entries.filter { it != CategoriaDeBusqueda.CAPITULOS }.flatMap { entidades(libro, it) }

    private fun capitulos(libro: Libro): List<Indexado> {
        val normales = libro.capitulos.map { it to false }
        val deInterludio = libro.interludios.flatMap { interludio -> interludio.capitulos.map { it to true } }
        return (normales + deInterludio).map { (capitulo, enInterludio) -> indexarCapitulo(libro, capitulo, enInterludio) }
    }

    private fun indexarCapitulo(libro: Libro, capitulo: Capitulo, enInterludio: Boolean): Indexado {
        val campos = listOf(campo("Título", capitulo.nombre), campo("Orden", capitulo.orden.toString())) +
            capitulo.escenas.flatMap { escena ->
                listOf(
                    campo("Escena", escena.nombre),
                    campo("Texto de escena", textoPlano(escena.descripcion)),
                    campo("Localización", escena.localizacion?.nombre.orEmpty()),
                    campo("Personajes", escena.personajes.mapNotNull { enEscena -> libro.personajes.firstOrNull { it.id == enEscena.id }?.nombre?.takeIf(String::isNotEmpty) }.joinToString(", ")),
                )
            }
        return Indexado(
            capitulo.id, CategoriaDeBusqueda.CAPITULOS, capitulo.nombre,
            if (enInterludio) "Capítulo de interludio" else "Capítulo ${capitulo.orden}",
            VistaDelLibro.DeCapitulo(capitulo.id, deInterludio = enInterludio),
            campos.filter { it.normalizado.isNotEmpty() },
        )
    }

    private fun entidades(libro: Libro, categoria: CategoriaDeBusqueda): List<Indexado> {
        val elemento = requireNotNull(categoria.elemento)
        fun indexado(id: Int, nombre: String, subtitulo: String, entradas: List<Entrada>, propios: List<CampoIndexado>) = Indexado(
            id, categoria, nombre, subtitulo, VistaDelLibro.DeElemento(elemento, seleccionado = id),
            (listOf(campo("Nombre", nombre)) + camposDeEntradas(entradas) + propios).filter { it.normalizado.isNotEmpty() },
        )
        fun nombreDePersonaje(id: Int?) = libro.personajes.firstOrNull { it.id == id }?.nombre.orEmpty()
        fun nombreDeLocalizacion(id: Int?) = libro.localizaciones.firstOrNull { it.id == id }?.nombre.orEmpty()
        return when (categoria) {
            CategoriaDeBusqueda.CAPITULOS -> emptyList()
            CategoriaDeBusqueda.PERSONAJES -> libro.personajes.map { personaje ->
                indexado(personaje.id, personaje.nombre, "Personaje", personaje.entradas, listOf(
                    campo("Apodo", personaje.apodos.joinToString(", ") { it.apodo }),
                    campo("Estado", personaje.estados.joinToString(", ") { it.estado.nombre }),
                    campo("Relaciones", personaje.relaciones.joinToString(", ") { "${it.relativo?.nombre.orEmpty()} ${it.parentesco}" }),
                ))
            }
            CategoriaDeBusqueda.ORGANIZACIONES -> libro.organizaciones.map { organizacion ->
                indexado(organizacion.id, organizacion.nombre, "Organización", organizacion.entradas, listOf(
                    campo("Personajes", organizacion.personajes.map { it.nombre.ifEmpty { nombreDePersonaje(it.id) } }.filter(String::isNotEmpty).joinToString(", ")),
                    campo("Localizaciones", organizacion.localizaciones.map { it.nombre.ifEmpty { nombreDeLocalizacion(it.id) } }.filter(String::isNotEmpty).joinToString(", ")),
                ))
            }
            CategoriaDeBusqueda.EVENTOS -> libro.eventos.map { evento ->
                val lugar = nombreDeLocalizacion(evento.idLocalizacion)
                indexado(evento.id, evento.nombre, if (lugar.isNotEmpty()) "Evento · $lugar" else "Evento", evento.entradas, listOf(
                    campo("Localización", lugar),
                    campo("Personajes", evento.personajes.map { it.nombre.ifEmpty { nombreDePersonaje(it.id) } }.filter(String::isNotEmpty).joinToString(", ")),
                ))
            }
            CategoriaDeBusqueda.LOCALIZACIONES -> libro.localizaciones.map { localizacion ->
                indexado(localizacion.id, localizacion.nombre, "Localización", localizacion.entradas, listOf(
                    campo("Estado", localizacion.estado ?: localizacion.estados.joinToString(", ") { it.nombre }),
                ))
            }
            CategoriaDeBusqueda.CONCEPTOS -> libro.conceptos.map { concepto ->
                indexado(concepto.id, concepto.nombre, "Concepto", concepto.entradas, emptyList())
            }
            CategoriaDeBusqueda.CITAS -> libro.citas.map { cita ->
                val quien = cita.nombrePersonaje ?: nombreDePersonaje(cita.idPersonaje)
                indexado(cita.id, cita.nombre, if (quien.isNotEmpty()) "Cita · $quien" else "Cita", cita.entradas, listOf(
                    campo("Página", cita.pagina?.toString().orEmpty()),
                    campo("Personaje", quien),
                ))
            }
        }
    }

    private fun camposDeEntradas(entradas: List<Entrada>): List<CampoIndexado> = entradas.flatMap {
        listOf(campo("Título de entrada", it.nombre), campo("Texto de entrada", textoPlano(it.descripcion)))
    }

    private fun campo(etiqueta: String, crudo: String): CampoIndexado {
        val valor = crudo.replace(espacios, " ").trim()
        val normalizado = normalizar(valor)
        return CampoIndexado(etiqueta, valor, normalizado, compactar(normalizado))
    }

    private fun textoPlano(valor: String): String = rtfATexto(valor).replace(espacios, " ").trim()

    private fun compactar(valor: String): String = valor.replace(espacios, "")
}

/**
 * La búsqueda del libro abierto (book-advanced-search.component.ts): lo escrito, las categorías activas, los grupos
 * plegados y el resultado, que se calcula fuera del hilo principal en cada cambio. Cada visita a la vista empieza de
 * cero, como el componente de la web; al plegar o girar el móvil se conserva.
 */
class BusquedaViewModel(ambito: AmbitoDeCuenta) : ViewModelDeCuenta(ambito) {
    var consulta by mutableStateOf("")
        private set
    var activas by mutableStateOf(CategoriaDeBusqueda.entries.toSet())
        private set
    var plegadas by mutableStateOf(emptySet<CategoriaDeBusqueda>())
        private set
    var resultado by mutableStateOf(BusquedaEnElLibro.vacia())
        private set

    private var visita: String? = null
    private var libro: Libro? = null
    private var indice: List<Indexado>? = null
    private var calculo: Job? = null
    /** En las muestras de depuración, la consulta no se borra al entrar. */
    private var deMuestra = false

    /** Al entrar en la vista: una [nuevaVisita] empieza de cero; con el mismo libro, el índice no se rehace. */
    fun entrar(nuevaVisita: String, libro: Libro?) {
        if (nuevaVisita != visita && !deMuestra) {
            visita = nuevaVisita
            consulta = ""
            activas = CategoriaDeBusqueda.entries.toSet()
            plegadas = emptySet()
        }
        if (libro !== this.libro) {
            this.libro = libro
            indice = null
        }
        recalcular()
    }

    fun escribir(texto: String) {
        consulta = texto
        recalcular()
    }

    fun limpiar() = escribir("")

    fun alternarCategoria(categoria: CategoriaDeBusqueda) {
        activas = if (categoria in activas) activas - categoria else activas + categoria
        recalcular()
    }

    fun alternarGrupo(categoria: CategoriaDeBusqueda) {
        plegadas = if (categoria in plegadas) plegadas - categoria else plegadas + categoria
    }

    fun desplegado(categoria: CategoriaDeBusqueda): Boolean = categoria !in plegadas

    /** Solo para las muestras de depuración. */
    internal fun mostrarMuestra(libro: Libro, texto: String) {
        deMuestra = true
        this.libro = libro
        escribir(texto)
    }

    private fun recalcular() {
        val libro = libro
        val consulta = consulta
        val activas = activas
        calculo?.cancel()
        if (libro == null || BusquedaEnElLibro.normalizar(consulta).isEmpty()) {
            resultado = BusquedaEnElLibro.vacia(activas)
            return
        }
        calculo = viewModelScope.launch {
            val hecho = indice ?: withContext(Dispatchers.Default) { BusquedaEnElLibro.indice(libro) }.also { if (this@BusquedaViewModel.libro === libro) indice = it }
            resultado = withContext(Dispatchers.Default) { BusquedaEnElLibro.buscar(hecho, consulta, activas) }
        }
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        calculo?.cancel()
        visita = null
        libro = null
        indice = null
        consulta = ""
        activas = CategoriaDeBusqueda.entries.toSet()
        plegadas = emptySet()
        resultado = BusquedaEnElLibro.vacia()
    }
}
