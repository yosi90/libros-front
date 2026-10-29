package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.red.ClienteLibros
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * El dictado con la clave de IA de la persona (`POST /dictado` de la API, roadmap de la IA, IA3): un trozo de audio
 * y el modelo de transcripción que eligió; devuelve el texto. El dictado gratuito, con el reconocedor del móvil, no
 * pasa por aquí. El audio no se guarda en ningún sitio.
 */
class RepositorioDictado(private val api: ClienteLibros) {
    suspend fun dictar(audio: ByteArray, tipo: String, proveedor: String, modelo: String, idLibro: Int?): String {
        val cuerpo = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("Audio", "dictado.m4a", audio.toRequestBody(tipo.toMediaType()))
            .addFormDataPart("Proveedor", proveedor)
            .addFormDataPart("Modelo", modelo)
            .apply { if (idLibro != null) addFormDataPart("LibroId", idLibro.toString()) }
            .build()
        return api.post("dictado", cuerpo).objeto { it.optString("Texto") }
    }
}
