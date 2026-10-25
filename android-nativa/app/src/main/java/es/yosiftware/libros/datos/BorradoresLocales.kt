package es.yosiftware.libros.datos

import java.io.File

/**
 * Los borradores de lo que se escribe y aún no ha llegado al servidor (el capítulo con sus escenas), en ficheros de la
 * carpeta de la cuenta que los escribió (`AmbitoDeCuenta.carpeta`): solo esa cuenta los recupera (CAMBIO_DE_CUENTA.md,
 * obligación 4). Se escriben enteros y de golpe (a un temporal que luego se renombra): si la app se mata a mitad, queda
 * el borrador anterior o el nuevo, nunca uno a medias. Es lo que hace que cerrar la app del todo no pierda lo escrito.
 */
object BorradoresLocales {
    private val nombreValido = Regex("[a-zA-Z0-9_-]+")

    fun guardar(carpeta: File, nombre: String, contenido: String) {
        require(nombreValido.matches(nombre)) { "Nombre de borrador no válido: $nombre" }
        carpeta.mkdirs()
        val temporal = File(carpeta, "$nombre.tmp")
        temporal.writeText(contenido)
        val destino = File(carpeta, "$nombre.json")
        if (!temporal.renameTo(destino)) {
            // En algunos sistemas de ficheros renombrar no pisa: se borra el anterior y se vuelve a intentar.
            destino.delete()
            if (!temporal.renameTo(destino)) error("No se pudo guardar el borrador $nombre")
        }
    }

    fun leer(carpeta: File, nombre: String): String? = File(carpeta, "$nombre.json").takeIf { it.exists() }?.readText()

    fun borrar(carpeta: File, nombre: String) {
        File(carpeta, "$nombre.json").delete()
        File(carpeta, "$nombre.tmp").delete()
    }
}
