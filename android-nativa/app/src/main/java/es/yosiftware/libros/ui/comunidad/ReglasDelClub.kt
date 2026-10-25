package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.modelos.LecturaDeClub
import es.yosiftware.libros.datos.modelos.Universo
import java.text.Collator
import java.util.Locale

/** Lo que el detalle del club calcula sin pantalla (`club-detail.component.ts`). */
object ReglasDelClub {
    private val orden: Collator = Collator.getInstance(Locale.forLanguageTag("es")).apply { strength = Collator.PRIMARY }

    /** Las obras de la colección de [tipo] para la lectura actual, por nombre (`readingTargetOptions`). */
    fun obrasDeTipo(tipo: String, universos: List<Universo>): List<Pair<Int, String>> {
        val obras = when (tipo) {
            "libro" -> universos.flatMap { u -> u.libros + u.sagas.flatMap { it.libros } }.map { it.id to it.nombre }
            "antologia" -> universos.flatMap { u -> u.antologias + u.sagas.flatMap { it.antologias } }.map { it.id to it.nombre }
            "saga" -> universos.flatMap { it.sagas }.filter { it.id > 0 && it.nombre != "Sin saga" }.map { it.id to it.nombre }
            "universo" -> universos.filter { it.id > 0 && it.nombre != "Sin universo" }.map { it.id to it.nombre }
            else -> emptyList()
        }
        return obras.distinctBy { it.first }.sortedWith { a, b -> orden.compare(a.second, b.second) }
    }

    /**
     * El nombre de una lectura (`readingLabel`): su texto si lo tiene; si no, el de la obra en la colección de la
     * persona; si no está, «Libro no disponible» (o el tipo que sea).
     */
    fun etiquetaDeLectura(lectura: LecturaDeClub, universos: List<Universo>): String {
        lectura.objetivoTexto?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        val objetivo = lectura.objetivo
        val nombre = objetivo?.id?.let { id -> obrasDeTipo(objetivo.tipo, universos).firstOrNull { it.first == id }?.second }
        return nombre ?: "${EtiquetasDeClubes.tipoDeObjetivo(objetivo?.tipo).ifEmpty { "Lectura" }} no disponible"
    }

    private val correo = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

    fun correoValido(texto: String): Boolean = correo.matches(texto.trim())

    /** Las opciones de una encuesta nueva: una por línea, sin las vacías. Valen de 2 a 10. */
    fun opcionesDeEncuesta(texto: String): List<String> = texto.lines().map { it.trim() }.filter { it.isNotEmpty() }

    fun opcionesValidas(opciones: List<String>): Boolean = opciones.size in 2..10

    /** Un número de los formularios (página, referencia), o `null` si está vacío o no es un número. */
    fun numero(texto: String): Double? = texto.trim().replace(',', '.').toDoubleOrNull()?.takeIf { it >= 0 }
}
