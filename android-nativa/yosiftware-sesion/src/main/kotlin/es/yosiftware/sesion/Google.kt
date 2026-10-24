package es.yosiftware.sesion

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.withTimeoutOrNull

/**
 * La credencial de Google con Credential Manager («Iniciar sesión con Google»), para el cliente web del proyecto de
 * Firebase de la plataforma. Google comprueba el paquete y la huella de la app con su cliente OAuth Android, que da
 * de alta la plataforma: si falta, aquí llega `google_no_disponible`.
 *
 * Tiene un final ([ESPERA_GOOGLE]): si la respuesta de Google se pierde (por ejemplo, porque el sistema congeló la app
 * mientras la ventana de Google la tapaba), llega `google_sin_respuesta` en vez de esperar para siempre. Cancelar la
 * corrutina que entra también lo corta, sin dejar nada a medias: la sesión se abre después, con la credencial.
 */
internal suspend fun credencialDeGoogle(actividad: Activity, clienteWeb: String): String {
    val opcion = GetSignInWithGoogleOption.Builder(serverClientId = clienteWeb).build()
    val peticion = GetCredentialRequest.Builder().addCredentialOption(opcion).build()
    val credencial = try {
        withTimeoutOrNull(ESPERA_GOOGLE) { CredentialManager.create(actividad).getCredential(actividad, peticion).credential }
            ?: throw ErrorSesion("google_sin_respuesta", "Google no ha respondido. Vuelve a intentarlo.")
    } catch (error: GetCredentialCancellationException) {
        throw ErrorSesion("google_cancelado", "Has cancelado la entrada con Google.", causa = error)
    } catch (error: GetCredentialException) {
        throw ErrorSesion("google_no_disponible", "No se ha podido entrar con Google.", causa = error)
    }
    if (credencial !is CustomCredential || credencial.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
        throw ErrorSesion("google_no_disponible", "No se ha podido entrar con Google.")
    }
    return try {
        GoogleIdTokenCredential.createFrom(credencial.data).idToken
    } catch (error: GoogleIdTokenParsingException) {
        throw ErrorSesion("google_no_disponible", "No se ha podido entrar con Google.", causa = error)
    }
}

/** Lo que se espera a Google: elegir la cuenta y, si Google lo pide, confirmarla en otro sitio. */
internal const val ESPERA_GOOGLE = 3 * 60_000L
