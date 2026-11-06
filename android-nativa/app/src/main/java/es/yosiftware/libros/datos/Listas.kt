package es.yosiftware.libros.datos

/**
 * La página siguiente de una lista con cursor, sin repetir lo que ya estaba (por [clave]): un elemento puede llegar
 * otra vez si la lista cambió entre una página y otra. Los nuevos van detrás; con [delante], delante (el chat, que
 * carga hacia atrás). Lo ya cargado no cambia de sitio.
 */
fun <T, K> List<T>.conLaPaginaSiguiente(nuevos: List<T>, delante: Boolean = false, clave: (T) -> K): List<T> {
    val conocidas = mapTo(HashSet()) { clave(it) }
    val sinRepetir = nuevos.filterNot { clave(it) in conocidas }
    return if (delante) sinRepetir + this else this + sinRepetir
}
