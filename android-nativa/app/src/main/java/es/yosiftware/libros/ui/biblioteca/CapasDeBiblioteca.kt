package es.yosiftware.libros.ui.biblioteca

import androidx.compose.runtime.Composable
import es.yosiftware.libros.datos.modelos.Obra

/**
 * Lo que la Biblioteca pone a pantalla completa encima del shell, en su orden: la antología abierta, el editor de una
 * de sus secciones y el editor de estado de una obra (que también se abre desde «Mi lectura» de la antología).
 */
@Composable
fun CapasDeBiblioteca(
    vm: BibliotecaViewModel,
    alAbrirSeccion: (Obra) -> Unit,
    alVerFicha: (Obra) -> Unit,
    alBuscarSimilares: (Obra) -> Unit,
) {
    vm.antologia?.let { antologia -> PantallaAntologia(vm, antologia, alAbrirSeccion, alVerFicha, alBuscarSimilares) }
    vm.edicionDeSeccion?.let { edicion ->
        EditorDeEstado(
            titulo = edicion.titulo,
            valores = edicion.valores,
            guardando = vm.guardando,
            alElegirEstado = vm::elegirEstadoDeSeccion,
            alPuntuar = vm::puntuarSeccion,
            alEscribirResena = vm::escribirResenaDeSeccion,
            alVolver = vm::cerrarEditorDeSeccion,
            alGuardar = vm::guardarSeccion,
            etiquetaVolver = "Volver a las secciones",
            exigeEstado = false,
        )
    }
    vm.edicion?.let { edicion ->
        EditorDeEstado(
            titulo = edicion.titulo,
            valores = edicion.valores,
            guardando = vm.guardando,
            alElegirEstado = vm::elegirEstadoEnEditor,
            alPuntuar = vm::elegirPuntuacion,
            alEscribirResena = vm::escribirResena,
            alVolver = vm::cerrarEditor,
            alGuardar = vm::guardar,
            sinCompartir = edicion.sinCompartir,
            alAlternarSinCompartir = vm::alternarSinCompartir,
        )
    }
}
