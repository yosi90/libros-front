package es.yosiftware.libros.ui.editor

import kotlin.math.pow

/**
 * Los colores de texto del escritorio (fondo oscuro) suelen ser claros, y sobre un tema claro desaparecen; un negro
 * explícito desaparece sobre un tema oscuro (src/app/shared/rtf/rtf-ink.ts). El color guardado no cambia: al pintarlo,
 * el tema que no lo lee pone su tinta. Un tramo con resaltado conserva su pareja de colores.
 */
enum class TonoDeTinta { CLARO, OSCURO }

object Tinta {
    private const val LUMINANCIA_CLARA = 0.6
    private const val LUMINANCIA_OSCURA = 0.06

    /** El tono de un color `#RRGGBB` que deja de leerse en algún tema, o `null` si se lee en los dos (`rtfInkTone`). */
    fun tono(hex: String?): TonoDeTinta? {
        val rgb = hex?.takeIf { it.length == 7 && it.startsWith('#') }?.let { color -> listOf(1, 3, 5).map { color.substring(it, it + 2).toIntOrNull(16) ?: return null } }
            ?: return null
        val luminancia = luminancia(rgb[0], rgb[1], rgb[2])
        return when {
            luminancia >= LUMINANCIA_CLARA -> TonoDeTinta.CLARO
            luminancia <= LUMINANCIA_OSCURA -> TonoDeTinta.OSCURO
            else -> null
        }
    }

    /** Si en un tema [oscuro] (o claro) el color [hex] sin resaltado se pinta con la tinta del tema. */
    fun seSustituye(hex: String?, resaltado: String?, oscuro: Boolean): Boolean {
        if (resaltado != null) return false
        return when (tono(hex)) {
            TonoDeTinta.CLARO -> !oscuro
            TonoDeTinta.OSCURO -> oscuro
            null -> false
        }
    }

    private fun luminancia(r: Int, g: Int, b: Int): Double {
        fun canal(valor: Int): Double {
            val normal = valor / 255.0
            return if (normal <= 0.03928) normal / 12.92 else ((normal + 0.055) / 1.055).pow(2.4)
        }
        return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
    }
}
