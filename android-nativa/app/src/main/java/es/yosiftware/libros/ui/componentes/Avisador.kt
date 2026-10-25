package es.yosiftware.libros.ui.componentes

import es.yosiftware.libros.datos.ErrorDeLibros

/** Lo que los ViewModels usan de [Avisos], para poder probarlos sin Android. */
interface Avisador {
    fun exito(mensaje: String)
    fun error(mensaje: String)
    /** `openApiError`: el título es [generico] y el mensaje, el del servidor. */
    fun deError(error: ErrorDeLibros, generico: String)

    /** Un éxito con su título, su clave, un botón y, si hace falta, más tiempo en pantalla. */
    fun exitoConAccion(mensaje: String, accion: AccionDeAviso, titulo: String? = null, clave: String? = null, duracionMs: Long? = null) =
        exito(mensaje)

    /** Sin avisos (las muestras y las pruebas que no los miran). */
    object Mudo : Avisador {
        override fun exito(mensaje: String) = Unit
        override fun error(mensaje: String) = Unit
        override fun deError(error: ErrorDeLibros, generico: String) = Unit
    }
}
