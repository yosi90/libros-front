package es.yosiftware.libros.ui.componentes

import es.yosiftware.libros.datos.ErrorDeLibros

/** Lo que los ViewModels usan de [Avisos], para poder probarlos sin Android. */
interface Avisador {
    fun exito(mensaje: String)
    fun error(mensaje: String)
    /** `openApiError`: el título es [generico] y el mensaje, el del servidor. */
    fun deError(error: ErrorDeLibros, generico: String)

    /** Sin avisos (las muestras y las pruebas que no los miran). */
    object Mudo : Avisador {
        override fun exito(mensaje: String) = Unit
        override fun error(mensaje: String) = Unit
        override fun deError(error: ErrorDeLibros, generico: String) = Unit
    }
}
