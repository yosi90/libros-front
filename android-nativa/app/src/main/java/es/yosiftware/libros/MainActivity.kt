package es.yosiftware.libros

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import es.yosiftware.libros.ui.AppLibros
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // De borde a borde: el contenido respeta las zonas del sistema con sus insets. El tema ajusta luego los colores
        // de las barras (ui/tema/Tema.kt).
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent { AppLibros(LibrosApp.sesion(this)) }
    }

    override fun onStart() {
        super.onStart()
        // Si la sesión se cerró desde la web social, se nota al volver (ecosistema-kit/APK.md); como mucho, una vez por minuto.
        LibrosApp.sesion(this)?.let { sesion -> lifecycleScope.launch { sesion.comprobar() } }
    }
}
