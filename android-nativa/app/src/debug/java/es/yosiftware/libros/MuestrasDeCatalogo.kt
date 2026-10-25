package es.yosiftware.libros

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.lifecycleScope
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.CadenaDeSagas
import es.yosiftware.libros.datos.modelos.DetallePublico
import es.yosiftware.libros.datos.modelos.Edicion
import es.yosiftware.libros.datos.modelos.EnlaceDeSaga
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Opcion
import es.yosiftware.libros.datos.modelos.Referencia
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.catalogo.CapasDeCatalogo
import es.yosiftware.libros.ui.catalogo.CatalogoViewModel
import es.yosiftware.libros.ui.catalogo.FormularioDePeticion
import es.yosiftware.libros.ui.catalogo.HojaDeSaga
import es.yosiftware.libros.ui.catalogo.PantallaCatalogo
import es.yosiftware.libros.ui.catalogo.PeticionAbierta
import es.yosiftware.libros.ui.catalogo.TipoDePeticion
import es.yosiftware.libros.ui.componentes.AnfitrionDeAvisos
import es.yosiftware.libros.ui.componentes.Avisos
import es.yosiftware.libros.ui.componentes.LocalAvisos
import es.yosiftware.libros.ui.navegacion.Armazon
import es.yosiftware.libros.ui.navegacion.Destino
import es.yosiftware.libros.ui.navegacion.NavegacionViewModel
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaMobile
import org.json.JSONObject

/**
 * Solo en las compilaciones de depuración: el Catálogo con los datos de `user.member-a` de las capturas
 * (referencias-apk-capacitor/catalogo/), para compararlas sin entrar. Se abre con
 *
 * ```
 * adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeCatalogo --es vista lista --es tema oscuro
 * ```
 *
 * Vistas: `lista`, `filtros`, `busqueda-con-saga` («general: Nacidos», sin resultados), `ficha-libro-en-coleccion`
 * («El imperio final»), `ficha-libro-fuera-coleccion` («El hobbit»), `ficha-antologia` («Arcanum ilimitado»),
 * `hoja-saga`, `peticion`, `cargando`, `error` y `aviso` (el de «Añadido a tu biblioteca»).
 */
class MuestrasDeCatalogo : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val vista = intent.getStringExtra("vista") ?: "lista"
        val tema = if (intent.getStringExtra("tema") == "oscuro") TemaMobile.Oscuro else TemaMobile.Claro
        val avisos = Avisos()
        val app = application as LibrosApp
        val vm = CatalogoViewModel(AmbitoDeCuenta("muestra", lifecycleScope), app.datos.catalogo, app.datos.coleccion, app.datos.peticiones, avisos)
        val nav = NavegacionViewModel(SavedStateHandle()).apply { irA(Destino.Catalogo) }
        when (vista) {
            "cargando" -> Unit
            "busqueda-con-saga" -> {
                vm.ponerTerminosDeMuestra(listOf("Nacidos"))
                vm.mostrarMuestra(emptyList(), listOf(bruma, wax))
            }
            else -> vm.mostrarMuestra(lista, idiomasDeMuestra = idiomas, estilosDeMuestra = estilos)
        }
        when (vista) {
            "filtros" -> vm.alternarFiltros()
            "ficha-libro-en-coleccion" -> vm.mostrarFichaDeMuestra(imperio, detalle(imperio, IMPERIO_JSON))
            "ficha-libro-fuera-coleccion" -> vm.mostrarFichaDeMuestra(hobbit, detalle(hobbit, HOBBIT_JSON))
            "ficha-antologia" -> vm.mostrarFichaDeMuestra(arcanum, detalle(arcanum, ARCANUM_JSON))
            "hoja-saga" -> vm.mostrarHojaDeMuestra(HojaDeSaga(bruma, listOf(heroe, imperio, pozo), cargando = false))
            "peticion" -> vm.mostrarPeticionDeMuestra(PeticionAbierta(FormularioDePeticion.alta(TipoDePeticion.LIBRO), activas = 0, consultandoActivas = false))
            "error" -> vm.mostrarErrorDeMuestra("No hemos podido cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.")
            "aviso" -> avisos.exito("Añadido a tu biblioteca", titulo = "El hobbit")
        }
        setContent {
            TemaLibros(tema) {
                CompositionLocalProvider(LocalVentana provides rememberVentana(), LocalAvisos provides remember { avisos }) {
                    Box(Modifier.fillMaxSize()) {
                        Armazon(nombre = "QA Usuario A", tema = tema, alAlternarTema = {}, nav = nav) { PantallaCatalogo(vm) }
                        CapasDeCatalogo(vm, alAbrirLectura = {})
                        AnfitrionDeAvisos(avisos, Modifier.align(Alignment.BottomCenter))
                    }
                }
            }
        }
    }

    private companion object {
        val sanderson = listOf(Autor(1, "Brandon sanderson"))
        val idiomas = listOf(Opcion(1, "Español"), Opcion(2, "Inglés"))
        val estilos = listOf(Opcion(1, "Aventura"), Opcion(2, "Fantasía"), Opcion(3, "Fantasía épica"))

        fun obra(id: Int, nombre: String, portada: String, autores: List<Autor>, isbn: String? = null, estado: TipoDeEstado? = null, antologia: Boolean = false) = Obra(
            tipo = if (antologia) Obra.ANTOLOGIA else Obra.LIBRO,
            id = id,
            nombre = nombre,
            portada = portada,
            autores = autores,
            estados = listOfNotNull(estado?.let { EstadoDeLectura(id * 10, it.id, it.nombre, "2026-10-20T10:00:00") }),
            isbn = isbn,
            ediciones = listOfNotNull(isbn?.let { Edicion(id, it, portada, null, false) }),
        )

        val imperio = obra(1, "El imperio final", "1.png", sanderson, "9788418037214", TipoDeEstado.EN_ESPERA).copy(puntuacion = 5, resena = "Reseña QA para moderación")
        val pozo = obra(5, "El pozo de la ascensión", "5.png", sanderson, estado = TipoDeEstado.QUIERO_LEER)
        val heroe = obra(13, "El héroe de las eras", "13.png", sanderson)
        val hobbit = obra(113, "El hobbit", "113.png", listOf(Autor(4, "J.r.r. Tolkien")), "9788445017210")
        val arcanum = obra(1, "Arcanum ilimitado", "A_1.jpg", sanderson, "9788466662321", antologia = true)

        // Las seis primeras del catálogo de QA por nombre, todas fuera de la biblioteca de `user.member-a`.
        val lista = listOf(
            obra(53, "Ala de dragón", "53.png", listOf(Autor(5, "Margaret weis"), Autor(6, "Tracy hickman"))),
            obra(17, "Alas de hierro", "17.jpg", listOf(Autor(7, "Rebecca yarros"))),
            obra(92, "Alas de onyx", "92.png", listOf(Autor(7, "Rebecca yarros"))),
            obra(12, "Alas de sangre", "12.jpg", listOf(Autor(7, "Rebecca yarros"))),
            obra(123, "Alchemised", "123.png", listOf(Autor(8, "Senlinyu"))),
            obra(46, "Aleación de ley", "46.png", sanderson),
        )

        val bruma = Saga(
            2, "Nacidos de la bruma", "Era 1 - el imperio final", 2, Referencia(2, "El cosmere"), sanderson,
            CadenaDeSagas(siguientes = listOf(EnlaceDeSaga(28, "Nacidos de la bruma", "Era 2 - wax y wayne")), familiaSagaId = 2, ordenLectura = 1),
            emptyList(), emptyList(),
        )

        val wax = Saga(
            28, "Nacidos de la bruma", "Era 2 - wax y wayne", 2, Referencia(2, "El cosmere"), sanderson,
            CadenaDeSagas(previas = listOf(EnlaceDeSaga(2, "Nacidos de la bruma", "Era 1 - el imperio final")), familiaSagaId = 2, ordenLectura = 2),
            emptyList(), emptyList(),
        )

        fun detalle(obra: Obra, json: String): DetallePublico {
            val base = JSONObject(json)
            base.put("Tipo", obra.tipo).put("Id", obra.id).put("Nombre", obra.nombre).put("Portada", obra.portada).put("ISBN", obra.isbn)
            base.put("Autores", org.json.JSONArray(obra.autores.map { JSONObject().put("Id", it.id).put("Nombre", it.nombre) }))
            base.put("Ediciones", org.json.JSONArray(obra.ediciones.map { JSONObject().put("Id", it.id).put("ISBN", it.isbn).put("Portada", it.portada).put("EnMiBiblioteca", false) }))
            return DetallePublico.de(base)
        }

        const val IMPERIO_JSON = """
            {"IdiomasDisponibles": [{"Id": 1, "Nombre": "Español"}, {"Id": 2, "Nombre": "Inglés"}],
             "Estilos": [{"Id": 1, "Nombre": "Aventura"}, {"Id": 2, "Nombre": "Fantasía"}, {"Id": 3, "Nombre": "Fantasía épica"}, {"Id": 4, "Nombre": "Ficción especulativa"}],
             "MiColeccion": {"EnBiblioteca": true, "EdicionesIds": [], "Estados": [{"Id": 10, "EstadoId": 0, "Nombre": "En espera", "Fecha": "2026-10-20T10:00:00"}],
                             "Puntuacion": 5, "Resena": "Reseña QA para moderación"},
             "Resenas": [],
             "Estadisticas": {"UsuariosEnBiblioteca": 2, "PuntuacionMedia": 5.0, "TotalPuntuaciones": 1, "TotalLeidos": 1, "TotalEnMarcha": 0}}
        """
        const val HOBBIT_JSON = """
            {"IdiomasDisponibles": [{"Id": 1, "Nombre": "Español"}, {"Id": 2, "Nombre": "Inglés"}],
             "Estilos": [{"Id": 5, "Nombre": "Alta fantasía"}, {"Id": 1, "Nombre": "Aventura"}, {"Id": 2, "Nombre": "Fantasía"}, {"Id": 6, "Nombre": "Juvenil"}],
             "MiColeccion": {"EnBiblioteca": false, "EdicionesIds": [], "Estados": []},
             "Resenas": [],
             "Estadisticas": {"UsuariosEnBiblioteca": 1, "TotalPuntuaciones": 0, "TotalLeidos": 1, "TotalEnMarcha": 0}}
        """
        const val ARCANUM_JSON = """
            {"MiColeccion": {"EnBiblioteca": false, "EdicionesIds": [], "Estados": []},
             "Resenas": [],
             "Estadisticas": {"UsuariosEnBiblioteca": 1, "TotalPuntuaciones": 0, "TotalLeidos": 0, "TotalEnMarcha": 0}}
        """
    }
}
