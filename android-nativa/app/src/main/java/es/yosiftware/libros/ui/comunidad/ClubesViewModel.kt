package es.yosiftware.libros.ui.comunidad

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.CursorDeClubes
import es.yosiftware.libros.datos.modelos.CursorDeEventos
import es.yosiftware.libros.datos.modelos.EventoProximo
import es.yosiftware.libros.datos.modelos.ResumenDeClub
import es.yosiftware.libros.datos.repositorios.RepositorioClubes

/**
 * Los clubes de la pestaña Comunidad (`community.component.ts`): Descubrir (populares, búsqueda y crear), Mis clubes y
 * Eventos. Acceso es [CentroDeAccesoViewModel]. Es de la cuenta: al cambiar se vacía ([ViewModelDeCuenta]).
 *
 * Distinto de la web, a propósito (fallos evidentes):
 * - Mis clubes y Eventos se leen enteros al abrirlos (`/clubes-lectura/mios` y los eventos próximos, con «Cargar
 *   más»): la web se quedaba con los 3 clubes y los 5 eventos del resumen.
 */
class ClubesViewModel(
    ambito: AmbitoDeCuenta,
    private val clubes: RepositorioClubes,
) : ViewModelDeCuenta(ambito) {
    var cargando by mutableStateOf(true)
        private set
    var falloDeCarga by mutableStateOf(false)
        private set
    var pestana by mutableStateOf(PestanaDeClubes.DESCUBRIR)
        private set
    var tieneClubes by mutableStateOf(false)
        private set

    var busqueda by mutableStateOf("")
        private set
    var descubrir by mutableStateOf<List<ResumenDeClub>>(emptyList())
        private set
    var siguiente by mutableStateOf<CursorDeClubes?>(null)
        private set
    var buscando by mutableStateOf(false)
        private set
    var populares by mutableStateOf<List<ResumenDeClub>>(emptyList())
        private set

    var misClubes by mutableStateOf<List<ResumenDeClub>>(emptyList())
        private set
    var cargandoMisClubes by mutableStateOf(false)
        private set
    var eventos by mutableStateOf<List<EventoProximo>>(emptyList())
        private set
    var siguientesEventos by mutableStateOf<CursorDeEventos?>(null)
        private set
    var cargandoEventos by mutableStateOf(false)
        private set

    var creadorAbierto by mutableStateOf(false)
        private set
    var nombre by mutableStateOf("")
        private set
    var descripcion by mutableStateOf("")
        private set
    var visibilidad by mutableStateOf("abierto")
        private set
    var creando by mutableStateOf(false)
        private set
    var errorDeCreacion by mutableStateOf("")
        private set

    /** Al crear un club, se abre su detalle. */
    var alCrear: (Int) -> Unit = {}

    /** Cada vez que se abre Clubes, como la web al crear el componente. */
    fun alEntrar() {
        if (ambito.identidad.value == null) return
        cargarDescubrir()
        cargarInicio()
        when (pestana) {
            PestanaDeClubes.MIS_CLUBES -> cargarMisClubes()
            PestanaDeClubes.EVENTOS -> cargarEventos()
            else -> Unit
        }
    }

    /** La primera página de Descubrir, a pantalla completa (`load`). */
    fun cargarDescubrir() {
        cargando = true
        falloDeCarga = false
        cargar({ clubes.descubrir(busqueda) }, alFallar = {
            cargando = false
            falloDeCarga = true
        }) { pagina ->
            descubrir = pagina.clubes
            siguiente = pagina.siguiente
            cargando = false
        }
    }

    fun elegir(nueva: PestanaDeClubes) {
        if (nueva.necesitaClubes && !tieneClubes) return
        pestana = nueva
        when (nueva) {
            PestanaDeClubes.MIS_CLUBES -> cargarMisClubes()
            PestanaDeClubes.EVENTOS -> cargarEventos()
            else -> Unit
        }
    }

    fun escribirBusqueda(texto: String) {
        busqueda = texto.take(100)
    }

    fun buscar() {
        if (buscando) return
        buscando = true
        cargar({ clubes.descubrir(busqueda) }, alFallar = { buscando = false }) { pagina ->
            descubrir = pagina.clubes
            siguiente = pagina.siguiente
            buscando = false
        }
    }

    fun cargarMas() {
        val cursor = siguiente ?: return
        if (buscando) return
        buscando = true
        cargar({ clubes.descubrir(busqueda, cursor = cursor) }, alFallar = { buscando = false }) { pagina ->
            val ids = descubrir.map { it.id }.toSet()
            descubrir = descubrir + pagina.clubes.filterNot { it.id in ids }
            siguiente = pagina.siguiente
            buscando = false
        }
    }

    fun cargarMisClubes() {
        cargandoMisClubes = true
        cargar({ clubes.mios() }, alFallar = { cargandoMisClubes = false }) { mios ->
            tieneClubes = mios.tieneClubes
            misClubes = mios.clubes
            cargandoMisClubes = false
        }
    }

    fun cargarEventos(mas: Boolean = false) {
        val cursor = if (mas) siguientesEventos ?: return else null
        cargandoEventos = true
        cargar({ clubes.eventosProximos(cursor) }, alFallar = { cargandoEventos = false }) { pagina ->
            eventos = if (cursor != null) eventos + pagina.eventos.filterNot { nuevo -> eventos.any { it.id == nuevo.id } } else pagina.eventos
            siguientesEventos = pagina.siguiente
            cargandoEventos = false
        }
    }

    // ---------- Crear club ----------

    fun alternarCreador() {
        creadorAbierto = !creadorAbierto
    }

    fun escribirNombre(texto: String) {
        nombre = texto.take(150)
    }

    fun escribirDescripcion(texto: String) {
        descripcion = texto.take(20000)
    }

    fun elegirVisibilidad(valor: String) {
        visibilidad = valor
    }

    /** Crea el club y abre su detalle (`createClub`). */
    fun crear(tieneLibros: Boolean) {
        if (CreacionDeClub.motivo(tieneLibros, creando, nombre) != null) return
        creando = true
        errorDeCreacion = ""
        cargar({ clubes.crear(nombre.trim(), visibilidad, descripcion.trim().ifEmpty { null }) }, alFallar = { error ->
            errorDeCreacion = error.mensajeO(CreacionDeClub.ERROR)
            creando = false
        }) { creado ->
            creando = false
            creadorAbierto = false
            nombre = ""
            descripcion = ""
            alCrear(creado.id)
        }
    }

    /** Tras un cambio de acceso (entrar, salir, aceptar…): se vuelve a leer lo que depende de él (`refreshClubContext`). */
    fun refrescar() {
        buscar()
        cargarInicio()
        if (tieneClubes) cargarMisClubes()
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        cargando = true
        falloDeCarga = false
        pestana = PestanaDeClubes.DESCUBRIR
        tieneClubes = false
        busqueda = ""
        descubrir = emptyList()
        siguiente = null
        buscando = false
        populares = emptyList()
        misClubes = emptyList()
        cargandoMisClubes = false
        eventos = emptyList()
        siguientesEventos = null
        cargandoEventos = false
        creadorAbierto = false
        nombre = ""
        descripcion = ""
        visibilidad = "abierto"
        creando = false
        errorDeCreacion = ""
    }

    /** El resumen de clubes (`loadClubHome`): si tiene clubes y los populares. Sus fallos no se enseñan, como en la web. */
    private fun cargarInicio() {
        cargar({ clubes.resumen() }) { resumen ->
            tieneClubes = resumen.tieneClubes
            populares = resumen.clubesPublicosActivos
            if (!resumen.tieneClubes && pestana.necesitaClubes) pestana = PestanaDeClubes.DESCUBRIR
        }
    }
}
