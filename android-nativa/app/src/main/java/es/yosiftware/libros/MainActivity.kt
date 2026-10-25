package es.yosiftware.libros

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import es.yosiftware.libros.push.AperturaDeAviso
import es.yosiftware.libros.ui.AppLibros
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // De borde a borde: el contenido respeta las zonas del sistema con sus insets. El tema ajusta luego los colores
        // de las barras (ui/tema/Tema.kt).
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        // Un aviso del push pulsado con la app cerrada; al recrearla (girar, plegar) no se repite.
        if (savedInstanceState == null) AperturaDeAviso.de(intent)?.let { (application as LibrosApp).aperturas.value = it }
        setContent { AppLibros(application as LibrosApp) }
    }

    /** Un aviso pulsado con la app abierta (`singleTop`). */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        AperturaDeAviso.de(intent)?.let { (application as LibrosApp).aperturas.value = it }
    }

    override fun onStart() {
        super.onStart()
        // Si la sesión se cerró desde la web social, se nota al volver (ecosistema-kit/APK.md); como mucho, una vez por minuto.
        LibrosApp.sesion(this)?.let { sesion -> lifecycleScope.launch { sesion.comprobar() } }
        // Al volver de los Ajustes del sistema, el permiso de avisos puede haber cambiado.
        LibrosApp.datos(this).push.recalcular()
    }
}
