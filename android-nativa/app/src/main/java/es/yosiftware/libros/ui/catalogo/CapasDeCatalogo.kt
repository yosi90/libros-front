package es.yosiftware.libros.ui.catalogo

import androidx.compose.runtime.Composable
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.ui.biblioteca.EditorDeEstado

/**
 * Lo que el Catálogo abre por encima de la navegación, de abajo arriba: la ficha pública, la hoja de una saga, el editor
 * de estado («Actualizar lectura») y el modal de petición.
 */
@Composable
fun CapasDeCatalogo(vm: CatalogoViewModel, alAbrirLectura: (Obra) -> Unit) {
    vm.ficha?.let { PantallaFicha(vm, it, alAbrirLectura) }
    vm.hoja?.let { HojaDeSagaDelCatalogo(vm, it) }
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
    vm.peticion?.let { ModalDePeticion(vm, it) }
}
