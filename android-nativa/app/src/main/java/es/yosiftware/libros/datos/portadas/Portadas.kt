package es.yosiftware.libros.datos.portadas

import android.content.Context
import android.os.Build
import coil3.gif.AnimatedImageDecoder
import coil3.gif.GifDecoder
import coil3.ImageLoader
import coil3.disk.DiskCache
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import es.yosiftware.libros.BuildConfig
import es.yosiftware.libros.datos.red.Red
import es.yosiftware.libros.datos.red.codificarComponente
import okhttp3.OkHttpClient
import okio.Path.Companion.toOkioPath

/**
 * Las portadas, como `cover-cache.service.ts`, con Coil 3 y su caché en disco en el lugar del Cache API de la web:
 * - la URL es la misma: `<API de Libros>image/get/cover/<nombre>`, con el nombre recortado y codificado como
 *   `encodeURIComponent`, sin token (la ruta es pública);
 * - un nombre vacío no se pide: se enseña el marcador de error de la web (`assets/media/img/error.png`, aquí
 *   `R.drawable.portada_error`), igual que si la descarga falla;
 * - `nocover.png` es la portada «sin portada» que la API asigna a las ediciones sin imagen: se pide y se guarda como
 *   cualquier otra, como hace la web;
 * - la caché no mira las cabeceras HTTP (Coil 3 no lo hace por defecto, como el Cache API): una portada se descarga
 *   una vez y se guarda hasta que se invalida ([invalidar], tras cambiarla) o el sistema vacía la caché.
 *
 * Las portadas son del catálogo, públicas y las mismas para todas las cuentas, así que su caché no va por cuenta. Cada
 * entorno es una app distinta (`es.yosiftware.libros` y `.qa`), con su propia caché.
 */
object Portadas {
    /** El nombre de la portada de una edición sin imagen. */
    const val SIN_PORTADA = "nocover.png"

    private const val CARPETA = "portadas"
    private const val TAMANO_MAXIMO = 256L * 1024 * 1024

    /** La URL de la portada [nombre], o `null` si no tiene (se enseña el marcador). */
    fun url(nombre: String?, base: String = BuildConfig.API_LIBROS): String? {
        val limpio = nombre?.trim().orEmpty()
        if (limpio.isEmpty()) return null
        return base.trimEnd('/') + "/image/get/cover/" + codificarComponente(limpio)
    }

    /** Si [nombre] es «sin portada»: vacío o `nocover.png`. */
    fun esSinPortada(nombre: String?): Boolean = nombre.isNullOrBlank() || nombre.trim() == SIN_PORTADA

    /** El cargador de imágenes de la app (`LibrosApp` es su `SingletonImageLoader.Factory`), con el cliente de [Red]. */
    fun cargador(contexto: Context, cliente: OkHttpClient = Red.cliente): ImageLoader = ImageLoader.Builder(contexto)
        .components {
            add(OkHttpNetworkFetcherFactory(callFactory = { cliente }))
            // Los GIF de los dragones del cargador: con el decodificador del sistema desde Android 9.
            add(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) AnimatedImageDecoder.Factory() else GifDecoder.Factory())
        }
        .diskCache {
            DiskCache.Builder()
                .directory(contexto.cacheDir.resolve(CARPETA).toOkioPath())
                .maxSizeBytes(TAMANO_MAXIMO)
                .build()
        }
        .build()

    /** Olvida la portada [nombre] en memoria y en disco, para que se vea la nueva (`invalidateCover`). */
    fun invalidar(cargador: ImageLoader, nombre: String?) {
        val url = url(nombre) ?: return
        cargador.memoryCache?.let { memoria -> memoria.keys.filter { it.key == url }.forEach(memoria::remove) }
        cargador.diskCache?.remove(url)
    }
}
