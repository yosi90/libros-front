package es.yosiftware.libros.ui.cuenta

import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.cuenta.Enlaces
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.BotonDeTexto
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.componentes.TextoEyebrow
import es.yosiftware.libros.ui.componentes.TextoTitulo
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.sesion.CuentaGuardada
import es.yosiftware.sesion.Normas

private val textoCorreo = Textos.cuerpo.copy(fontSize = (0.8 * 16).sp)
private val textoNombre = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = (1.35 * 16).sp, fontWeight = FontWeight.Bold, lineHeight = 1.2.em)
private val textoEnlace = Textos.cuerpo.copy(fontSize = (0.84 * 16).sp, fontWeight = FontWeight.Bold, lineHeight = 1.2.em)

/**
 * El panel de cuentas (ecosistema-kit/APK.md, «Cambiar de cuenta dentro de la app»), como el de la app Yosiftware y el
 * de `<yosi-acceso>` en las webs, pero con el aspecto Mobile de Libros: la hoja de «Más» ([HojaInferior]), con la cuenta
 * activa grande (su avatar, su nombre y su correo), «Perfil y cuenta en Yosiftware», las demás cuentas guardadas (un
 * toque cambia a ella; las caducadas, marcadas, con «Volver a entrar» y «Olvidar»), «Añadir otra cuenta», «Cerrar
 * sesión» y «Cerrar sesión en todas las cuentas», y al pie los enlaces de la cuenta en la web social. Se abre desde el
 * avatar del rail y desde «Cuenta» en la hoja «Más».
 */
@Composable
fun PanelDeCuentas(
    abierto: Boolean,
    alCerrar: () -> Unit,
    vm: CuentaViewModel,
    perfiles: PerfilesViewModel,
    activaId: String?,
    alias: String,
    correo: String?,
    cuentas: List<CuentaGuardada>,
) {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    val sesion = vm.sesion
    // Cada acción cierra el panel antes, como el de la app Yosiftware: el cambio se ve en la pantalla.
    val y: (() -> Unit) -> () -> Unit = { accion -> { alCerrar(); accion() } }
    HojaInferior(abierta = abierto, alCerrar = alCerrar, titulo = "Tus cuentas") {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(Alturas.botonDeIcono))
            Text(
                correo.orEmpty(),
                Modifier.weight(1f),
                color = colores.tintaSuave,
                style = textoCorreo,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            BotonDeIcono(Iconos.close, "Cerrar", alCerrar)
        }
        Column(
            Modifier.fillMaxWidth().padding(bottom = Espacios.e4),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Espacios.e2),
        ) {
            val nombre = perfiles.nombre(activaId, alias)
            Avatar(tamanoFoto = 80.dp, url = perfiles.avatar(activaId), nombre = nombre, conBorde = false)
            Text(nombre, color = colores.tinta, style = textoNombre, textAlign = TextAlign.Center)
            if (nombre != alias) Text("@$alias", color = colores.tintaSuave, style = textoCorreo)
            if (sesion != null) {
                Spacer(Modifier.height(Espacios.e1))
                BotonDeYosiftware("Perfil y cuenta en Yosiftware", y { Enlaces.abrir(contexto, sesion.direccionWebSocial("perfil")) })
            }
        }

        val otras = cuentas.filterNot { it.activa }
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(Radios.sm))
                .border(1.dp, colores.contorno, RoundedCornerShape(Radios.sm)),
        ) {
            otras.forEach { cuenta ->
                FilaDeCuenta(
                    cuenta = cuenta,
                    perfiles = perfiles,
                    detalle = if (cuenta.caducada) "Su sesión ha caducado" else null,
                    alPulsar = if (cuenta.caducada) null else y { vm.elegirCuenta(cuenta.id) },
                    alOlvidar = if (cuenta.caducada) ({ vm.olvidarCuenta(cuenta.id) }) else null,
                    alVolverAEntrar = if (cuenta.caducada) y { vm.anadirCuenta() } else null,
                    habilitada = !vm.ocupado,
                    enLista = true,
                )
                Separador()
            }
            if (cuentas.count { !it.caducada } < MAXIMO_DE_CUENTAS) {
                FilaDeAccion(Iconos.personAdd, "Añadir otra cuenta", y { vm.anadirCuenta() }, !vm.ocupado)
                Separador()
            }
            FilaDeAccion(Iconos.logout, "Cerrar sesión", y { vm.salir() }, !vm.ocupado)
            if (cuentas.size > 1) {
                Separador()
                FilaDeAccion(Iconos.logout, "Cerrar sesión en todas las cuentas", y { vm.salirDeTodas() }, !vm.ocupado)
            }
        }
        vm.error?.let {
            Spacer(Modifier.height(Espacios.e3))
            AvisoDeAcceso(it, Iconos.warning, TonoDeAviso.Error)
        }
        Spacer(Modifier.height(Espacios.e3))
        EnlacesDeLaCuenta(alAbrir = alCerrar, conPerfil = false)
        Spacer(Modifier.height(Espacios.e3))
    }
}

@Composable
private fun Separador() {
    Box(Modifier.fillMaxWidth().height(1.dp).background(mezclar(LocalColores.current.contorno, 0.72f)))
}

/**
 * Una cuenta guardada: su avatar de 40 dp, su nombre (o su alias) con `@alias` debajo si es otro, y lo que se pueda hacer con
 * ella. [alPulsar] cambia a ella; una caducada lleva [detalle] en el color de atención, y «Volver a entrar» y «Olvidar».
 * Fuera de la lista ([enLista] falso), con la superficie y el radio de `.m-list-item`.
 */
@Composable
fun FilaDeCuenta(
    cuenta: CuentaGuardada,
    perfiles: PerfilesViewModel,
    detalle: String?,
    alPulsar: (() -> Unit)?,
    alOlvidar: (() -> Unit)?,
    habilitada: Boolean,
    alVolverAEntrar: (() -> Unit)? = null,
    enLista: Boolean = false,
) {
    val colores = LocalColores.current
    val nombre = perfiles.nombre(cuenta.id, cuenta.alias)
    Column(
        Modifier
            .fillMaxWidth()
            .then(if (enLista) Modifier else Modifier.clip(RoundedCornerShape(Radios.sm)).border(1.dp, colores.contorno, RoundedCornerShape(Radios.sm)))
            .background(colores.superficie)
            .then(if (alPulsar != null) Modifier.clickable(enabled = habilitada, role = Role.Button, onClick = alPulsar) else Modifier)
            .semantics { selected = cuenta.activa }
            .padding(Espacios.e3),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.CenterVertically) {
            Avatar(tamanoFoto = 40.dp, url = perfiles.avatar(cuenta.id), nombre = nombre, conBorde = false)
            Column(Modifier.weight(1f)) {
                Text(nombre, color = colores.tinta, style = Textos.filaPrincipal, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (nombre != cuenta.alias) {
                    Text("@${cuenta.alias}", color = colores.tintaSuave, style = Textos.filaSecundaria, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                if (detalle != null) {
                    Text(detalle, color = if (cuenta.caducada) colores.atencion else colores.tintaSuave, style = Textos.filaSecundaria)
                }
            }
            if (alOlvidar != null && alVolverAEntrar == null) {
                BotonDeIcono(Iconos.close, "Quitar @${cuenta.alias} de esta app", alOlvidar, color = colores.tintaSuave, habilitado = habilitada)
            }
        }
        if (alVolverAEntrar != null) {
            Row(
                Modifier.fillMaxWidth().padding(top = Espacios.e2),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End),
            ) {
                if (alOlvidar != null) Boton("Olvidar", alOlvidar, variante = VarianteDeBoton.Contorno, habilitado = habilitada)
                Boton("Volver a entrar", alVolverAEntrar, variante = VarianteDeBoton.Tonal, icono = Iconos.login, habilitado = habilitada)
            }
        }
    }
}

/** Una acción del panel: icono de 24 dp en la tinta suave, el texto y 56 dp de alto. */
@Composable
private fun FilaDeAccion(@DrawableRes icono: Int, texto: String, alPulsar: () -> Unit, habilitada: Boolean) {
    val colores = LocalColores.current
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .background(colores.superficie)
            .clickable(enabled = habilitada, role = Role.Button, onClick = alPulsar)
            .padding(horizontal = Espacios.e4),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(40.dp), contentAlignment = Alignment.Center) {
            Icon(painterResource(icono), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(24.dp))
        }
        Text(texto, color = colores.tinta, style = textoEnlace)
    }
}

/**
 * Un botón a la web social: el `.m-button--outline` con el símbolo del ecosistema delante del texto (MARCA.md: en todo
 * enlace a la web social).
 */
@Composable
fun BotonDeYosiftware(texto: String, alPulsar: () -> Unit) {
    Boton(texto, alPulsar, variante = VarianteDeBoton.Contorno, icono = Iconos.simboloYosiftware)
}

/**
 * Lo de la cuenta que se hace fuera de la app (APK.md, «Entrar», puntos 5 y 6): el perfil, las sesiones y la privacidad,
 * en la web social y con el símbolo del ecosistema, y «Errores y propuestas», que abre la web de Libros con `?reportar`.
 * Con el aspecto de las filas de la hoja «Más» (`.m-more-sheet`): 48 dp, el icono en el primario y el texto en negrita.
 * [alAbrir] se llama antes de salir al navegador (para cerrar la hoja).
 */
@Composable
fun EnlacesDeLaCuenta(alAbrir: () -> Unit, conPerfil: Boolean = true) {
    val contexto = LocalContext.current
    val vm = LocalCuenta.current ?: return
    val sesion = vm.sesion ?: return
    val abrir: (String) -> Unit = { direccion -> alAbrir(); Enlaces.abrir(contexto, direccion) }
    Column(Modifier.fillMaxWidth()) {
        if (conPerfil) FilaDeEnlace(Iconos.simboloYosiftware, "Perfil y cuenta en Yosiftware") { abrir(sesion.direccionWebSocial("perfil")) }
        FilaDeEnlace(Iconos.simboloYosiftware, "Sesiones") { abrir(sesion.direccionWebSocial("sesiones")) }
        FilaDeEnlace(Iconos.simboloYosiftware, "Privacidad") { abrir(sesion.direccionWebSocial("privacidad")) }
        FilaDeEnlace(Iconos.bugReport, "Errores y propuestas") { abrir(Enlaces.reportar) }
    }
}

@Composable
private fun FilaDeEnlace(@DrawableRes icono: Int, texto: String, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = Alturas.botonDeIcono)
            .clip(RoundedCornerShape(Radios.sm))
            .clickable(role = Role.Button, onClick = alPulsar)
            .padding(horizontal = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(22.dp))
        Text(texto, Modifier.weight(1f), color = colores.tinta, style = textoEnlace)
        Icon(painterResource(Iconos.openInNew), contentDescription = "Se abre en el navegador", tint = colores.tintaSuave, modifier = Modifier.size(18.dp))
    }
}

/**
 * Unas normas a pantalla completa, con la barra pública y el texto partido en títulos, puntos y párrafos
 * ([bloquesDe]). Con [alAceptar], el botón «Aceptar» abajo; sin él, solo para leerlas. Atrás la cierra.
 */
@Composable
fun LectorDeNormas(normas: Normas, alAceptar: (() -> Unit)?, ocupado: Boolean, alCerrar: () -> Unit) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    BackHandler(onBack = alCerrar)
    Column(
        Modifier
            .fillMaxSize()
            .background(colores.lienzo)
            .clickable(enabled = false) {},
    ) {
        BarraPublica(alCerrar, "Volver")
        Column(
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(
                    start = max(Espacios.e4, zona.calculateLeftPadding(direccion)),
                    end = max(Espacios.e4, zona.calculateRightPadding(direccion)),
                    top = Espacios.e6,
                    bottom = Espacios.e6,
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(Modifier.widthIn(max = 720.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                TextoEyebrow("Normas · versión ${normas.version}")
                TextoTitulo(normas.titulo)
                Spacer(Modifier.height(Espacios.e2))
                bloquesDe(normas.texto).forEach { bloque ->
                    when (bloque) {
                        is BloqueDeTexto.Titulo -> Text(
                            bloque.texto,
                            Modifier.padding(top = Espacios.e2),
                            color = colores.tinta,
                            style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.SemiBold, fontSize = (if (bloque.nivel <= 2) 1.2 * 16 else 1.05 * 16).sp),
                        )
                        is BloqueDeTexto.Punto -> Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                            Text("•", color = colores.primario, style = Textos.apoyo)
                            Text(bloque.texto, color = colores.tinta, style = Textos.apoyo)
                        }
                        is BloqueDeTexto.Parrafo -> Text(bloque.texto, color = colores.tinta, style = Textos.apoyo)
                    }
                }
            }
        }
        if (alAceptar != null) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(colores.superficie)
                    .drawBehind { drawRect(mezclar(colores.contorno, 0.66f), Offset.Zero, Size(size.width, 1.dp.toPx())) }
                    .padding(
                        start = max(Espacios.e4, zona.calculateLeftPadding(direccion)),
                        end = max(Espacios.e4, zona.calculateRightPadding(direccion)),
                        top = Espacios.e3,
                        bottom = max(Espacios.e3, zona.calculateBottomPadding()),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Row(Modifier.widthIn(max = 720.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                    Boton("Volver", alCerrar, Modifier.weight(1f), VarianteDeBoton.Contorno)
                    Boton("Aceptar", alAceptar, Modifier.weight(1f), habilitado = !ocupado)
                }
            }
        }
    }
}

/** El texto de un aviso cuando no hay conexión con la plataforma pero la sesión sigue guardada (`SinConexion`). */
@Composable
fun AvisoSinConexion(mensaje: String, ocupado: Boolean, alReintentar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier
            .fillMaxWidth()
            .background(colores.contenedorAtencion)
            .padding(horizontal = Espacios.e4, vertical = Espacios.e1),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.wifiOff), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(20.dp))
        Text(mensaje, Modifier.weight(1f), color = colores.tinta, style = Textos.filaSecundaria)
        BotonDeTexto(if (ocupado) "Reintentando…" else "Reintentar", alReintentar, habilitado = !ocupado)
    }
}
