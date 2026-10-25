package es.yosiftware.libros.ui.catalogo

import java.time.YearMonth

// Las peticiones de catálogo de la vista Mobile (catalog.component.ts en 5dc3120): pedir un libro nuevo (el botón «+»)
// y proponer una corrección de la ficha abierta. Sin red ni Compose.

/** Para qué es la petición (`CatalogEntityType`); la vista Mobile pide libros y corrige libros o antologías. */
enum class TipoDePeticion(val api: String, val etiqueta: String) {
    LIBRO("libro", "Libro"),
    ANTOLOGIA("antologia", "Antología"),
}

/** El formulario de una petición, con lo que la persona escribe. */
data class FormularioDePeticion(
    val tipo: TipoDePeticion,
    /** `null` en un alta; el id de la obra en una corrección. */
    val obraId: Int? = null,
    val obraNombre: String = "",
    val nombre: String = "",
    val isbn: String = "",
    val fechaPublicacion: String = "",
    val sinopsis: String = "",
    val comentario: String = "",
    val errorDeIsbn: String = "",
) {
    val esCorreccion: Boolean get() = obraId != null
    val accion: String get() = if (esCorreccion) "edicion" else "alta"

    /** «Pedir nuevo libro» o «Proponer corrección de libro» (`requestModalTitle`). */
    val titulo: String
        get() = when {
            esCorreccion -> "Proponer corrección de ${tipo.etiqueta.lowercase()}"
            tipo == TipoDePeticion.LIBRO -> "Pedir nuevo libro"
            else -> "Pedir nueva antología"
        }

    val etiquetaDeAccion: String get() = if (esCorreccion) "Corrección de ficha" else "Alta en catálogo"
    val etiquetaDeNombre: String get() = if (esCorreccion) "Nombre correcto" else "Nombre"
    val etiquetaDeIsbn: String get() = if (esCorreccion) "ISBN correcto" else "ISBN *"
    val etiquetaDeComentario: String get() = if (esCorreccion) "Coméntanos qué deberíamos cambiar" else "Nota con más detalles"

    companion object {
        fun alta(tipo: TipoDePeticion) = FormularioDePeticion(tipo)

        /** Una corrección empieza con el nombre, el ISBN y la fecha que tiene la ficha (`openCorrectionRequest`). */
        fun correccion(tipo: TipoDePeticion, id: Int, nombre: String, isbn: String?, fecha: String?) =
            FormularioDePeticion(tipo, id, nombre, nombre, isbn.orEmpty(), fecha.orEmpty())
    }
}

/** Lo que pasa al intentar enviar: o el error que se enseña (y si es del ISBN), o lo que se manda. */
sealed interface ResultadoDeValidacion {
    data class ErrorDeIsbn(val mensaje: String) : ResultadoDeValidacion
    data class Error(val mensaje: String) : ResultadoDeValidacion
    data class Listo(val datos: Map<String, String>) : ResultadoDeValidacion
}

object Peticiones {
    const val LIMITE_ACTIVAS = 5

    /** Las comprobaciones de `submitRequest`, en su orden, y la carga útil (`buildRequestPayload`) sin campos vacíos. */
    fun validar(formulario: FormularioDePeticion): ResultadoDeValidacion {
        val isbn = formulario.isbn.trim()
        if ((!formulario.esCorreccion || isbn.isNotEmpty()) && !isbnValido(formulario.isbn))
            return ResultadoDeValidacion.ErrorDeIsbn("Indica un ISBN-10 o ISBN-13 válido para el alta.")
        if (!fechaValida(formulario.fechaPublicacion.trim()))
            return ResultadoDeValidacion.Error("Escribe un año, un año y mes o una fecha completa válidos")
        val datos = linkedMapOf(
            "Nombre" to formulario.nombre.trim(),
            "ISBN" to isbn,
            "FechaPublicacion" to formulario.fechaPublicacion.trim(),
            "Sinopsis" to formulario.sinopsis.trim(),
            "Comentario" to formulario.comentario.trim(),
        ).filterValues { it.isNotEmpty() }
        if (datos.isEmpty()) return ResultadoDeValidacion.Error("Indica al menos un dato o comentario para la petición")
        return ResultadoDeValidacion.Listo(datos)
    }

    /** El ISBN sin espacios ni guiones y en mayúsculas (`normalizeIsbn`). */
    fun normalizarIsbn(valor: String): String = valor.replace(Regex("[\\s-]"), "").uppercase()

    /** Formato, prefijo 978/979 y dígito de control; el ISBN-10 sin convertir, y nunca todo ceros (`isValidIsbn`). */
    fun isbnValido(valor: String): Boolean {
        val isbn = normalizarIsbn(valor)
        if (Regex("^(978|979)\\d{10}$").matches(isbn))
            return isbn.mapIndexed { i, c -> (c - '0') * (if (i % 2 == 1) 3 else 1) }.sum() % 10 == 0
        if (Regex("^\\d{9}[\\dX]$").matches(isbn) && !Regex("^0+$").matches(isbn))
            return isbn.mapIndexed { i, c -> (if (c == 'X') 10 else c - '0') * (10 - i) }.sum() % 11 == 0
        return false
    }

    /** Vacía, «AAAA», «AAAA-MM» o «AAAA-MM-DD» de verdad (`validPublicationDate`). */
    fun fechaValida(valor: String): Boolean {
        if (valor.isEmpty()) return true
        val partes = Regex("^(\\d{4})(?:-(\\d{2})(?:-(\\d{2}))?)?$").find(valor) ?: return false
        val anio = partes.groupValues[1].toInt()
        val mes = partes.groupValues[2].takeIf { it.isNotEmpty() }?.toInt() ?: 1
        val dia = partes.groupValues[3].takeIf { it.isNotEmpty() }?.toInt() ?: 1
        if (mes !in 1..12 || dia < 1) return false
        return dia <= YearMonth.of(anio, mes).lengthOfMonth()
    }

    /** «3 de 5 peticiones activas» y si ya no caben más. */
    fun etiquetaDeActivas(activas: Int): String = "$activas de $LIMITE_ACTIVAS peticiones activas"
}
