package es.yosiftware.libros.ui.cuenta

import es.yosiftware.libros.ui.componentes.FrasesDelDragon
import es.yosiftware.libros.ui.componentes.ContextoDeCarga
import es.yosiftware.libros.ui.componentes.CargadorDelDragon
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.Image
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import es.yosiftware.libros.R
import es.yosiftware.libros.cuenta.Enlaces
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeTexto
import es.yosiftware.libros.ui.componentes.FilaDeLista
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.sesion.CuentaGuardada
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.Motivo
import es.yosiftware.sesion.ResumenNormas
import kotlinx.coroutines.delay

// Una pantalla por estado de la sesión (ecosistema-kit/APK.md, la tabla de estados), con el aspecto de las pantallas
// públicas de la APK de Capacitor (PaginaPublica.kt). `ConSesion` es el shell; con las normas de Libros pendientes,
// [PantallaDeNormasDeLibros] antes de seguir.

/** Un paso a medias de entrar: tiene su propia pantalla hasta que se termina o se cancela. */
fun EstadoSesion.esUnPaso() = this is EstadoSesion.AltaRequerida || this is EstadoSesion.SegundoFactorRequerido ||
    this is EstadoSesion.AbrirEnNavegador || this is EstadoSesion.BorradoProgramado || this is EstadoSesion.NormasDeUsoPendientes

/**
 * La pantalla de un estado sin el shell: entrar, los pasos de entrar y el arranque. [cuentas] son las guardadas en la
 * app (para volver a una al salir de otra).
 */
@Composable
fun PantallaDeLaSesion(estado: EstadoSesion, vm: CuentaViewModel, perfiles: PerfilesViewModel, cuentas: List<CuentaGuardada>) {
    when (estado) {
        EstadoSesion.Comprobando -> PantallaDeArranque()
        is EstadoSesion.SinSesion -> PantallaDeEntrar(vm, perfiles, estado.motivo, cuentas)
        is EstadoSesion.AltaRequerida -> PantallaDeAlta(vm, estado.normasUso)
        EstadoSesion.SegundoFactorRequerido -> PantallaDeSegundoFactor(vm)
        is EstadoSesion.AbrirEnNavegador -> PantallaDelNavegador(vm, estado.motivo, estado.direccion)
        is EstadoSesion.BorradoProgramado -> PantallaDeBorrado(vm, estado.borrarDesde)
        is EstadoSesion.NormasDeUsoPendientes -> PantallaDeNormasDeUso(vm, estado.normas)
        // Las dos con el shell: AppLibros no llega aquí con ellas.
        is EstadoSesion.ConSesion, is EstadoSesion.SinConexion -> PantallaDeArranque()
    }
}

/**
 * El arranque, mientras la librería comprueba la sesión guardada (y al cambiar de cuenta, que pasa por `Comprobando`).
 * La APK de Capacitor enseñaba aquí el splash de Android 12 (referencias-apk-capacitor/arranque/, `splash`): el icono de
 * la app en el centro, sobre el fondo de la ventana. Se pinta igual que el del sistema, para que el paso de uno a otro no
 * se note: la capa de delante del icono adaptable a 240 dp, recortada en un círculo de 160 dp sobre su fondo. Si tarda
 * más de un segundo y medio (sin red, al cambiar de cuenta), aparece encima el cargador de los dragones.
 */
@Composable
fun PantallaDeArranque() {
    val colores = LocalColores.current
    var largo by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(1_500)
        largo = true
    }
    Box(
        Modifier.fillMaxSize().background(colores.lienzo).semantics { contentDescription = "Comprobando tu sesión" },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier.size(160.dp).clip(CircleShape).background(colorResource(R.color.ic_launcher_background)),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                ImageBitmap.imageResource(R.mipmap.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.requiredSize(240.dp),
                filterQuality = FilterQuality.High,
            )
        }
        // Si tarda, el dragón de la APK de Capacitor con «Recuperando tu biblioteca…» (`sessionReady` de la web).
        if (largo) CargadorDelDragon(remember { FrasesDelDragon.abrir(ContextoDeCarga.BIBLIOTECA, null) })
    }
}

/** Esta compilación no tiene la configuración de la plataforma: no puede entrar. En depuración, ver la navegación. */
@Composable
fun PantallaSinConfiguracion(alVerSinCuenta: (() -> Unit)?) {
    PaginaDeAcceso(
        eyebrow = "Memoria Bibliográfica",
        titulo = "Sin cuenta en esta compilación.",
        apoyo = "A esta compilación le falta la configuración de la plataforma (su google-services.json), así que no puede entrar.",
        alVolver = null,
    ) {
        ConTuCuentaDeYosiftware("Se entra con la cuenta de Yosiftware")
        if (alVerSinCuenta != null) Boton("Ver la navegación (depuración)", alVerSinCuenta, Modifier.fillMaxWidth(), VarianteDeBoton.Tonal)
    }
}

/** Mientras se habla con la plataforma o con Google, que se vea que está trabajando. */
@Composable
private fun Trabajando(texto: String) {
    val colores = LocalColores.current
    Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator(color = colores.primario, strokeWidth = 3.dp, modifier = Modifier.size(20.dp))
        Text(texto, color = colores.tinta, style = Textos.filaSecundaria)
    }
}

/** El error de la última acción, con la frase de la plataforma. */
@Composable
private fun ErrorDeLaAccion(vm: CuentaViewModel) {
    vm.error?.let { AvisoDeAcceso(it, Iconos.warning, TonoDeAviso.Error) }
}

/** El motivo por el que la plataforma cerró la sesión (o la de pruebas privadas, `acceso_restringido`). */
@Composable
private fun AvisoDelMotivo(motivo: Motivo) {
    val icono = if (motivo.codigo == "acceso_restringido") Iconos.lock else Iconos.info
    AvisoDeAcceso(motivo.mensaje, icono)
}

/**
 * `SinSesion`: entrar. El aspecto es el de `/login` de la APK de Capacitor (la presentación con su cita, el botón de
 * Google y el formulario de correo de `login-mobile-view`), y el contenido, el de la librería:
 * - arriba, sin bloquear, «Continuar como @alias» con la sesión de otra app (solo al tocar);
 * - las cuentas que siguen guardadas en la app, para volver a una sin contraseña;
 * - Google (con el servicio en primer plano corto), y el correo y la contraseña;
 * - «He olvidado mi contraseña» y «Crea tu biblioteca», en la página de acceso, en el navegador.
 * No hay teléfono: la plataforma no lo tiene. Mientras se añade otra cuenta, Atrás vuelve a la de antes.
 */
@Composable
fun PantallaDeEntrar(
    vm: CuentaViewModel,
    perfiles: PerfilesViewModel,
    motivo: Motivo?,
    cuentas: List<CuentaGuardada>,
    desplazamiento: ScrollState = rememberScrollState(),
) {
    val contexto = LocalContext.current
    val actividad = LocalActivity.current
    val sesion = vm.sesion ?: return
    var correo by rememberSaveable { mutableStateOf("") }
    var contrasena by remember { mutableStateOf("") }
    var visible by rememberSaveable { mutableStateOf(false) }
    var indiceCita by rememberSaveable { mutableIntStateOf(citasCortas.indices.random()) }
    val puedeEntrar = !vm.ocupado && correo.isNotBlank() && contrasena.isNotEmpty()
    val entrar = { if (puedeEntrar) vm.entrarConContrasena(correo, contrasena) }

    LaunchedEffect(Unit) { vm.buscarOtrasApps() }
    BackHandler(enabled = vm.anadiendo, onBack = vm::cancelarAnadir)

    PaginaDeAcceso(
        eyebrow = if (vm.anadiendo) "Añadir otra cuenta" else "Tu biblioteca te espera",
        titulo = if (vm.anadiendo) "Entra con otra cuenta." else "Bienvenido de nuevo.",
        apoyo = if (vm.anadiendo) {
            "La que tienes abierta se queda guardada: podrás volver a ella cuando quieras."
        } else {
            "Retoma tus lecturas, notas y recuerdos exactamente donde los dejaste."
        },
        alVolver = if (vm.anadiendo) vm::cancelarAnadir else null,
        etiquetaVolver = "Volver a la cuenta de antes",
        cita = citasCortas[indiceCita.coerceIn(citasCortas.indices)],
        citaEnCompacta = true,
        // El formulario de correo de la APK (`mobile-login-method__content`): el panel, de 320 a 380 dp.
        panelMinimo = 320.dp,
        panelMaximo = 380.dp,
        separacion = { ancho -> (ancho * 0.07f).coerceIn(48f, 72f).dp },
        desplazamiento = desplazamiento,
    ) {
        ConTuCuentaDeYosiftware()
        if (vm.ocupado) Trabajando("Entrando con tu cuenta…")
        motivo?.let { AvisoDelMotivo(it) }
        vm.aviso?.let { AvisoDeAcceso(it) }

        // Las que siguen guardadas (al salir de una): se vuelve a cualquiera con un toque.
        val guardadas = if (vm.anadiendo) emptyList() else cuentas
        if (guardadas.isNotEmpty()) {
            Text("Tus cuentas en esta app", color = LocalColores.current.tinta, style = Textos.filaPrincipal)
            guardadas.forEach { cuenta ->
                FilaDeCuenta(
                    cuenta = cuenta,
                    perfiles = perfiles,
                    detalle = if (cuenta.caducada) "Su sesión ha caducado: entra otra vez con ella." else "Toca para entrar sin contraseña.",
                    alPulsar = if (cuenta.caducada || vm.ocupado) null else ({ vm.elegirCuenta(cuenta.id) }),
                    alOlvidar = { vm.olvidarCuenta(cuenta.id) },
                    habilitada = !vm.ocupado,
                )
            }
        }

        // Si otra app del ecosistema ya tiene sesión en este móvil, entrar con un toque (APK.md, «La sesión de otra app»).
        vm.otrasApps.forEach { otra ->
            BotonDeOtraApp(otra.alias, otra.app, habilitado = !vm.ocupado) { vm.continuarCon(otra) }
        }

        BotonDeGoogle(alPulsar = { actividad?.let(vm::entrarConGoogle) }, habilitado = !vm.ocupado)
        SeparadorDeAcceso("o con tu correo")
        CampoDeAcceso(
            etiqueta = "Correo electrónico",
            valor = correo,
            alCambiar = { correo = it.take(100); vm.olvidarError() },
            icono = Iconos.mail,
            ejemplo = "tu@correo.com",
            teclado = KeyboardOptions(keyboardType = KeyboardType.Email, autoCorrectEnabled = false, imeAction = ImeAction.Next),
            habilitado = !vm.ocupado,
        )
        CampoDeAcceso(
            etiqueta = "Contraseña",
            valor = contrasena,
            alCambiar = { contrasena = it; vm.olvidarError() },
            icono = Iconos.lock,
            teclado = KeyboardOptions(keyboardType = KeyboardType.Password, autoCorrectEnabled = false, imeAction = ImeAction.Done),
            acciones = KeyboardActions(onDone = { entrar() }),
            secreto = true,
            visible = visible,
            alCambiarVisible = { visible = !visible },
            habilitado = !vm.ocupado,
        )
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            BotonDeTexto("He olvidado mi contraseña", { Enlaces.abrir(contexto, sesion.direccionPaginaDeAcceso()) }, subrayado = true)
        }
        Boton("Iniciar sesión", { entrar() }, Modifier.fillMaxWidth(), habilitado = puedeEntrar)
        ErrorDeLaAccion(vm)
        PieDeAcceso("¿Aún no tienes cuenta?", "Crea tu biblioteca", { Enlaces.abrir(contexto, sesion.direccionCrearCuenta()) }, pequenoEnAncha = true)
    }
}

/**
 * «Continuar como @alias» y, si se sabe, «con tu sesión de <app>»: el `.m-button--tonal` de la APK, con el símbolo del
 * ecosistema delante (es la cuenta de Yosiftware) y la segunda línea en pequeño.
 */
@Composable
private fun BotonDeOtraApp(alias: String, app: String?, habilitado: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clip(Radios.pildora)
            .background(colores.contenedorPrimario)
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar)
            .padding(horizontal = 21.dp, vertical = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.simboloYosiftware), contentDescription = null, tint = colores.sobreContenedorPrimario, modifier = Modifier.size(22.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Continuar como @$alias", color = colores.sobreContenedorPrimario, style = Textos.boton)
            if (app != null) {
                Text("con tu sesión de $app", Modifier.padding(top = 4.dp), color = colores.sobreContenedorPrimario, style = Textos.filaSecundaria)
            }
        }
    }
}

/** `AltaRequerida`: cuenta nueva (con Google). El alias, las normas de uso y crear la cuenta. */
@Composable
fun PantallaDeAlta(vm: CuentaViewModel, normas: ResumenNormas) {
    var alias by rememberSaveable { mutableStateOf("") }
    var acepto by rememberSaveable { mutableStateOf(false) }
    val colores = LocalColores.current
    BackHandler(onBack = vm::cancelar)
    PaginaDeAcceso(
        eyebrow = "Cuenta nueva",
        titulo = "Elige tu alias.",
        apoyo = "Es la primera vez que entras con esta cuenta de Yosiftware. Elige el alias con el que te verán en Libros y en las demás webs.",
        alVolver = vm::cancelar,
        etiquetaVolver = "Cancelar",
    ) {
        ConTuCuentaDeYosiftware("Tu cuenta de Yosiftware")
        if (vm.ocupado) Trabajando("Creando tu cuenta…")
        CampoDeAcceso(
            etiqueta = "Alias",
            valor = alias,
            alCambiar = { alias = it; vm.olvidarError() },
            icono = Iconos.person,
            teclado = KeyboardOptions(keyboardType = KeyboardType.Text, autoCorrectEnabled = false, imeAction = ImeAction.Done),
            habilitado = !vm.ocupado,
        )
        FilaDeNormas(normas.titulo, vm::leerNormasDeUso)
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .toggleable(value = acepto, onValueChange = { acepto = it }, role = Role.Checkbox),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        ) {
            Checkbox(
                checked = acepto,
                onCheckedChange = null,
                colors = CheckboxDefaults.colors(checkedColor = colores.primario, uncheckedColor = colores.contornoFuerte, checkmarkColor = colores.sobrePrimario),
            )
            Text("He leído y acepto las normas de uso", color = colores.tinta, style = Textos.cuerpo)
        }
        Boton("Crear la cuenta", { vm.completarAlta(alias) }, Modifier.fillMaxWidth(), habilitado = !vm.ocupado && acepto && alias.isNotBlank())
        Boton("Cancelar", vm::cancelar, Modifier.fillMaxWidth(), VarianteDeBoton.Contorno, habilitado = !vm.ocupado)
        ErrorDeLaAccion(vm)
    }
}

/** Unas normas en una fila de lista (`.m-list-item`): su título y «Léelas», que las abre a pantalla completa. */
@Composable
private fun FilaDeNormas(titulo: String, alLeer: () -> Unit) {
    FilaDeLista(
        titulo = titulo,
        secundario = "Toca para leerlas",
        icono = Iconos.article,
        alPulsar = alLeer,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = LocalColores.current.tintaSuave)
    }
}

/**
 * `SegundoFactorRequerido`: el código de 6 cifras de la app de autenticación (se envía solo con la sexta cifra), o uno
 * de recuperación. La pantalla espera a que la persona vuelva de copiar el código.
 */
@Composable
fun PantallaDeSegundoFactor(vm: CuentaViewModel) {
    var codigo by rememberSaveable { mutableStateOf("") }
    var recuperacion by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(vm.error) { if (vm.error != null) codigo = "" }
    BackHandler(onBack = vm::cancelar)
    PaginaDeAcceso(
        eyebrow = "Verificación en dos pasos",
        titulo = if (recuperacion) "Usa un código de recuperación." else "Escribe tu código.",
        apoyo = if (recuperacion) {
            "Escribe uno de los códigos de recuperación que guardaste al activar la verificación en dos pasos."
        } else {
            "Abre tu app de autenticación y escribe el código de 6 cifras. Puedes ir a copiarlo y volver: esta pantalla te espera."
        },
        alVolver = vm::cancelar,
        etiquetaVolver = "Cancelar",
    ) {
        ConTuCuentaDeYosiftware()
        if (vm.ocupado) Trabajando("Comprobando el código…")
        if (!recuperacion) {
            CampoDeAcceso(
                etiqueta = "Código de 6 cifras",
                valor = codigo,
                alCambiar = { nuevo ->
                    codigo = nuevo.filter(Char::isDigit).take(6)
                    vm.olvidarError()
                    if (codigo.length == 6 && !vm.ocupado) vm.enviarCodigo(codigo)
                },
                icono = Iconos.password,
                teclado = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                acciones = KeyboardActions(onDone = { if (codigo.length == 6 && !vm.ocupado) vm.enviarCodigo(codigo) }),
                habilitado = !vm.ocupado,
            )
            Boton("Verificar", { vm.enviarCodigo(codigo) }, Modifier.fillMaxWidth(), habilitado = !vm.ocupado && codigo.length == 6)
        } else {
            CampoDeAcceso(
                etiqueta = "Código de recuperación",
                valor = codigo,
                alCambiar = { codigo = it.trim(); vm.olvidarError() },
                icono = Iconos.password,
                teclado = KeyboardOptions(keyboardType = KeyboardType.Ascii, autoCorrectEnabled = false, imeAction = ImeAction.Done),
                acciones = KeyboardActions(onDone = { if (codigo.isNotBlank() && !vm.ocupado) vm.enviarCodigo(codigo) }),
                habilitado = !vm.ocupado,
            )
            Boton("Verificar", { vm.enviarCodigo(codigo) }, Modifier.fillMaxWidth(), habilitado = !vm.ocupado && codigo.isNotBlank())
        }
        ErrorDeLaAccion(vm)
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            BotonDeTexto(if (recuperacion) "Usar la app de autenticación" else "Usar un código de recuperación", {
                recuperacion = !recuperacion
                codigo = ""
                vm.olvidarError()
            })
        }
    }
}

/**
 * `AbrirEnNavegador`: falta confirmar el correo (`verificacion`) o vincular una forma de entrar nueva (`vinculacion`).
 * La app no lo hace: abre la dirección en el navegador del sistema y, al volver, la persona entra otra vez.
 */
@Composable
fun PantallaDelNavegador(vm: CuentaViewModel, motivo: String, direccion: String) {
    val contexto = LocalContext.current
    val verificar = motivo == "verificacion"
    // Al volver del navegador, de nuevo el formulario de entrar.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { vm.alVolverDelNavegador() }
    BackHandler(onBack = vm::cancelar)
    PaginaDeAcceso(
        eyebrow = "Un paso más",
        titulo = if (verificar) "Confirma tu correo." else "Vincula esta forma de entrar.",
        apoyo = if (verificar) {
            "Antes de entrar tienes que confirmar tu correo en la página de acceso de Yosiftware."
        } else {
            "Esta forma de entrar es nueva para tu cuenta de Yosiftware. Vincúlala en la página de acceso."
        },
        alVolver = vm::cancelar,
    ) {
        ConTuCuentaDeYosiftware()
        AvisoDeAcceso("Se abre en el navegador. Cuando termines, vuelve aquí y entra otra vez.", Iconos.openInNew)
        Boton("Abrir en el navegador", {
            vm.alAbrirElNavegador()
            Enlaces.abrir(contexto, direccion)
        }, Modifier.fillMaxWidth(), icono = Iconos.openInNew)
        Boton("Volver a entrar", vm::cancelar, Modifier.fillMaxWidth(), VarianteDeBoton.Contorno, habilitado = !vm.ocupado)
        ErrorDeLaAccion(vm)
    }
}

/** `BorradoProgramado`: la cuenta tiene el borrado pedido. El día y «Conservar mi cuenta»; si no, no entra. */
@Composable
fun PantallaDeBorrado(vm: CuentaViewModel, borrarDesde: String?) {
    BackHandler(onBack = vm::cancelar)
    val dia = fechaLarga(borrarDesde)
    PaginaDeAcceso(
        eyebrow = "Tu cuenta de Yosiftware",
        titulo = "Tu cuenta se va a borrar.",
        apoyo = "Pediste borrar tu cuenta. Si la conservas, sigue como estaba, con todo lo tuyo en Libros y en las demás webs.",
        alVolver = vm::cancelar,
    ) {
        ConTuCuentaDeYosiftware()
        if (vm.ocupado) Trabajando("Conservando tu cuenta…")
        AvisoDeAcceso(dia?.let { "Se borrará a partir del $it." } ?: "Se borrará en unos días.", Iconos.eventBusy)
        Boton("Conservar mi cuenta", vm::conservarCuenta, Modifier.fillMaxWidth(), habilitado = !vm.ocupado)
        Boton("No entrar", vm::cancelar, Modifier.fillMaxWidth(), VarianteDeBoton.Contorno, habilitado = !vm.ocupado)
        ErrorDeLaAccion(vm)
    }
}

/** `NormasDeUsoPendientes`: hay normas de uso nuevas y no hay tokens hasta aceptarlas. */
@Composable
fun PantallaDeNormasDeUso(vm: CuentaViewModel, normas: ResumenNormas) {
    PantallaDeNormas(
        vm = vm,
        eyebrow = "Normas de uso",
        titulo = "Hay normas nuevas.",
        apoyo = "Las normas de uso de Yosiftware han cambiado. Para seguir, léelas y acéptalas.",
        normas = normas,
        alLeer = vm::leerNormasDeUso,
        alAceptar = vm::aceptarNormasDeUso,
    )
}

/** `ConSesion` con `normasPendientes`: las normas propias de Libros, antes de seguir (la API no deja sin ellas). */
@Composable
fun PantallaDeNormasDeLibros(vm: CuentaViewModel, normas: ResumenNormas) {
    PantallaDeNormas(
        vm = vm,
        eyebrow = "Normas de Libros",
        titulo = "Antes de seguir.",
        apoyo = "Memoria Bibliográfica tiene normas propias. Léelas y acéptalas para usar tu biblioteca.",
        normas = normas,
        alLeer = vm::leerNormasDeLaWeb,
        alAceptar = vm::aceptarNormasDeLaWeb,
    )
}

@Composable
private fun PantallaDeNormas(
    vm: CuentaViewModel,
    eyebrow: String,
    titulo: String,
    apoyo: String,
    normas: ResumenNormas,
    alLeer: () -> Unit,
    alAceptar: () -> Unit,
) {
    PaginaDeAcceso(eyebrow = eyebrow, titulo = titulo, apoyo = apoyo, alVolver = null) {
        ConTuCuentaDeYosiftware()
        if (vm.ocupado) Trabajando("Un momento…")
        FilaDeNormas(normas.titulo, alLeer)
        Boton("Aceptar", alAceptar, Modifier.fillMaxWidth(), habilitado = !vm.ocupado)
        Boton("Salir", vm::salir, Modifier.fillMaxWidth(), VarianteDeBoton.Contorno, icono = Iconos.logout, habilitado = !vm.ocupado)
        ErrorDeLaAccion(vm)
    }
}

