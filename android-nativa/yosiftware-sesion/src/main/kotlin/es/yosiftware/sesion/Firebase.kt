package es.yosiftware.sesion

import java.io.IOException
import java.net.URLEncoder
import org.json.JSONException
import org.json.JSONObject

/** Lo que da Firebase al entrar: su ID token, para cambiarlo por la sesión nativa, y si el usuario es nuevo. */
internal data class CredencialFirebase(val idToken: String, val nuevo: Boolean)

/**
 * Firebase Auth por su API REST, sin el SDK de Firebase: no queda ninguna sesión de Firebase en el móvil (la
 * credencial solo se usa una vez, para el canje) y no entra ninguna librería de Firebase.
 */
internal class FirebaseRest(private val configuracion: ConfiguracionSesion, private val transporte: Transporte) {

    suspend fun entrarConContrasena(correo: String, contrasena: String): CredencialFirebase {
        val cuerpo = JSONObject()
            .put("email", correo.trim())
            .put("password", contrasena)
            .put("returnSecureToken", true)
        val respuesta = llamar("accounts:signInWithPassword", cuerpo)
        return CredencialFirebase(respuesta.getString("idToken"), nuevo = false)
    }

    /** Cambia la credencial de Google (de Credential Manager) por una de Firebase. */
    suspend fun entrarConGoogle(idTokenGoogle: String): CredencialFirebase {
        val cuerpo = JSONObject()
            .put("postBody", "id_token=${URLEncoder.encode(idTokenGoogle, "UTF-8")}&providerId=google.com")
            .put("requestUri", "http://localhost")
            .put("returnSecureToken", true)
            .put("returnIdpCredential", true)
        val respuesta = llamar("accounts:signInWithIdp", cuerpo)
        return CredencialFirebase(respuesta.getString("idToken"), nuevo = respuesta.optBoolean("isNewUser", false))
    }

    /** Pone [nueva] como contraseña del usuario de [idToken], que acaba de entrar (1.6.0). */
    suspend fun cambiarContrasena(idToken: String, nueva: String) {
        val cuerpo = JSONObject().put("idToken", idToken).put("password", nueva).put("returnSecureToken", true)
        llamar("accounts:update", cuerpo, CONTRASENA_NUEVA)
    }

    /** Borra el usuario de Firebase recién creado para un alta que no puede seguir (registro cerrado). */
    suspend fun borrar(idToken: String) {
        try {
            llamar("accounts:delete", JSONObject().put("idToken", idToken))
        } catch (_: ErrorSesion) {
            // Si no se puede, la retención de la plataforma lo borra con el alta sin terminar.
        }
    }

    /** [propios]: lo que significa un error de Firebase en esa llamada, antes que lo de entrar. */
    private suspend fun llamar(metodo: String, cuerpo: JSONObject, propios: Map<String, () -> ErrorSesion> = emptyMap()): JSONObject {
        val url = "${configuracion.firebaseAuth.trimEnd('/')}/v1/$metodo?key=" +
            URLEncoder.encode(configuracion.firebaseClaveApi, "UTF-8")
        val respuesta = try {
            transporte.enviar(Peticion("POST", url, cuerpo.toString()))
        } catch (error: IOException) {
            throw ErrorSesion("sin_conexion", "No se ha podido conectar. Comprueba la conexión.", causa = error)
        }
        val json = try {
            JSONObject(respuesta.cuerpo)
        } catch (error: JSONException) {
            throw ErrorSesion("respuesta_no_valida", "No se ha podido entrar. Inténtalo de nuevo.", causa = error)
        }
        if (respuesta.estado in 200..299) return json
        val mensaje = json.optJSONObject("error")?.optString("message").orEmpty().substringBefore(" ").trim()
        propios[mensaje]?.let { throw it() }
        throw when (mensaje) {
            "INVALID_LOGIN_CREDENTIALS", "INVALID_PASSWORD", "EMAIL_NOT_FOUND", "INVALID_EMAIL", "MISSING_PASSWORD" ->
                ErrorSesion("credenciales_no_validas", "El correo o la contraseña no son correctos.")
            "USER_DISABLED" -> ErrorSesion("usuario_deshabilitado", "Esta forma de acceso está deshabilitada.")
            "TOO_MANY_ATTEMPTS_TRY_LATER" ->
                ErrorSesion("demasiados_intentos", "Demasiados intentos. Espera un poco y vuelve a probar.")
            else -> ErrorSesion("firebase_no_disponible", "No se ha podido entrar. Inténtalo de nuevo.")
        }
    }

    private companion object {
        val CONTRASENA_NUEVA = mapOf(
            "WEAK_PASSWORD" to { ErrorSesion("contrasena_debil", "La contraseña nueva no cumple los requisitos.") },
            "CREDENTIAL_TOO_OLD_LOGIN_AGAIN" to { ErrorSesion("reautenticacion_requerida", "Vuelve a escribir tu contraseña actual.") },
        )
    }
}
