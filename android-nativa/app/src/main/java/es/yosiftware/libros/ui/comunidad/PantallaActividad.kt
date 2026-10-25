package es.yosiftware.libros.ui.comunidad

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import es.yosiftware.libros.datos.modelos.Novedad
import es.yosiftware.libros.datos.modelos.PersonaDeYosiftware
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra1
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

// La Actividad de Comunidad en la APK: la vista Mobile de `community-activity` (el feed de novedades de Libros en la
// plataforma, con «me gusta» y comentarios), con los tokens de las demás pantallas de Comunidad.

private val formatoDeFecha = DateTimeFormatter.ofPattern("d MMM y, HH:mm", Locale.forLanguageTag("es"))

/** «25 oct 2026, 10:30», como el `date:'d MMM y, HH:mm'` de la web (sin el punto que pone Java a los meses). */
internal fun fechaDeNovedad(iso: String?, zona: ZoneId = ZoneId.systemDefault()): String =
    FechasDeClubes.leer(iso, zona)?.format(formatoDeFecha)?.replace(".", "").orEmpty()

@Composable
fun PantallaActividad(vm: ActividadViewModel, acciones: AccionesDeComunidad) {
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    LaunchedEffect(Unit) { vm.recargar() }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(if (ancha) Espacios.e4 else Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e1)) {
            Text("Actividad", color = colores.tinta, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.SemiBold, fontSize = rem(1.25)))
            Text("Lo que comparten en Libros tus amistades y quienes sigues.", color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.82)))
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Row(
                Modifier.weight(1f).heightIn(min = 44.dp).clickable(role = Role.Button) { acciones.abrirWebSocial("novedades") },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(painterResource(Iconos.simboloYosiftware), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp))
                Text("Qué compartes", color = colores.primario, style = Textos.cuerpo.copy(fontWeight = FontWeight.ExtraBold))
            }
            BotonDeIcono(Iconos.refresh, "Actualizar actividad", { vm.recargar() }, habilitado = !vm.cargando)
        }
        if (vm.error.isNotEmpty()) Text(vm.error, color = colores.error, style = Textos.cuerpo)
        when {
            vm.cargando && vm.lista.isEmpty() -> EstadoDePantalla(Iconos.hourglassTop, "Cargando la actividad…")
            vm.lista.isEmpty() && vm.cargada -> {
                EstadoDePantalla(
                    Iconos.dynamicFeed,
                    "Cuando tus amistades o quienes sigues empiecen, terminen o puntúen un libro, aparecerá aquí.",
                    titulo = "Aún no hay actividad",
                )
                if (vm.descubrir.isNotEmpty()) {
                    TituloDeLista("Descubrir")
                    vm.descubrir.forEach { TarjetaDeNovedad(vm, it, acciones) }
                }
            }
            else -> {
                vm.lista.forEach { TarjetaDeNovedad(vm, it, acciones) }
                if (vm.cursor != null) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Boton(if (vm.cargandoMas) "Cargando…" else "Cargar más", vm::cargarMas, variante = VarianteDeBoton.Contorno, habilitado = !vm.cargandoMas)
                    }
                }
            }
        }
    }
}

@Composable
private fun TarjetaDeNovedad(vm: ActividadViewModel, novedad: Novedad, acciones: AccionesDeComunidad) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    Column(
        Modifier.fillMaxWidth().sombra1(forma, colores).clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma),
    ) {
        acciones.avatar(novedad.cabecera)?.let { cabecera ->
            AsyncImage(cabecera, novedad.textoDeCabecera.orEmpty(), Modifier.fillMaxWidth().aspectRatio(16f / 9f), contentScale = ContentScale.Crop)
        }
        Row(Modifier.fillMaxWidth().padding(Espacios.e3), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            FotoDePersona(novedad.persona, acciones, 42)
            Column(Modifier.weight(1f)) {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(novedad.persona.visible) }
                        append(" ")
                        append(novedad.texto)
                    },
                    color = colores.tinta, style = Textos.cuerpo,
                )
                Text(fechaDeNovedad(novedad.creada), Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.72)))
                novedad.enlace?.let { enlace ->
                    Row(
                        Modifier.heightIn(min = 44.dp).clickable(role = Role.Button) { acciones.abrirEnlace(enlace) },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text("Abrir", color = colores.primario, style = Textos.cuerpo.copy(fontWeight = FontWeight.ExtraBold))
                        Icon(painterResource(Iconos.openInNew), contentDescription = null, tint = colores.primario, modifier = Modifier.size(16.dp))
                    }
                }
            }
            novedad.imagen?.let { imagen ->
                AsyncImage(imagen, null, Modifier.size(44.dp, 64.dp).clip(RoundedCornerShape(Radios.xs)), contentScale = ContentScale.Crop)
            }
        }
        Row(Modifier.padding(start = Espacios.e3, end = Espacios.e3, bottom = Espacios.e3), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Reaccion(
                if (novedad.meGustaPropio) Iconos.favorite else Iconos.favoriteBorder, "${novedad.meGusta}",
                activa = novedad.meGustaPropio, habilitada = novedad.id !in vm.meGustaEnCurso,
                descripcion = if (novedad.meGustaPropio) "Quitar «me gusta»" else "Me gusta",
            ) { vm.alternarMeGusta(novedad) }
            Reaccion(Iconos.chatBubbleOutline, "${novedad.comentarios}", activa = false, habilitada = true, descripcion = "Comentarios") { vm.alternarComentarios(novedad) }
        }
        vm.comentarios[novedad.id]?.let { abiertos ->
            HorizontalDivider(thickness = 1.dp, color = colores.contorno)
            Column(Modifier.fillMaxWidth().padding(Espacios.e3), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                if (abiertos.cargando && abiertos.lista.isEmpty()) Text("Cargando comentarios…", color = colores.tintaSuave, style = Textos.cuerpo)
                abiertos.lista.forEach { comentario ->
                    Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        FotoDePersona(comentario.persona, acciones, 30)
                        Column(Modifier.weight(1f)) {
                            Text(comentario.persona.visible, color = colores.tinta, style = Textos.filaPrincipal)
                            Text(comentario.texto, Modifier.padding(top = 2.dp), color = colores.tinta, style = Textos.cuerpo)
                        }
                        if (vm.puedeBorrar(novedad, comentario)) {
                            BotonDeIcono(Iconos.deleteOutline, "Borrar el comentario", { vm.borrarComentario(novedad, comentario) }, color = colores.tintaSuave)
                        }
                    }
                }
                if (abiertos.cursor != null) {
                    Boton("Ver más comentarios", { vm.cargarComentarios(novedad, mas = true) }, variante = VarianteDeBoton.Contorno, habilitado = !abiertos.cargando)
                }
                CampoDeFormulario(abiertos.borrador, { vm.escribir(novedad, it) }, "Escribe un comentario", lineas = 2, maximo = 500)
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                    Boton(if (abiertos.enviando) "Enviando…" else "Comentar", { vm.comentar(novedad) }, habilitado = abiertos.borrador.isNotBlank() && !abiertos.enviando)
                }
                if (abiertos.error.isNotEmpty()) Text(abiertos.error, color = colores.error, style = Textos.cuerpo)
            }
        }
    }
}

@Composable
private fun FotoDePersona(persona: PersonaDeYosiftware, acciones: AccionesDeComunidad, tamano: Int) {
    val colores = LocalColores.current
    val url = acciones.avatar(persona.avatar)
    if (url != null) {
        Avatar(tamano.dp, url = url, nombre = persona.visible.removePrefix("@"), conBorde = false)
    } else {
        Box(Modifier.size(tamano.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
            Text(persona.visible.removePrefix("@").take(1).uppercase(), color = colores.primario, style = Textos.filaPrincipal)
        }
    }
}

/** Un botón de reacción en píldora con borde: el icono y su número; activo, en el color de error (el corazón). */
@Composable
private fun Reaccion(icono: Int, numero: String, activa: Boolean, habilitada: Boolean, descripcion: String, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(50)
    val tinta = if (activa) colores.error else colores.tintaSuave
    Row(
        Modifier.heightIn(min = 44.dp).clip(forma).border(1.dp, if (activa) colores.error else colores.contorno, forma)
            .clickable(enabled = habilitada, role = Role.Button, onClickLabel = descripcion, onClick = alPulsar).padding(horizontal = Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(painterResource(icono), contentDescription = descripcion, tint = tinta, modifier = Modifier.size(18.dp))
        Text(numero, color = tinta, style = Textos.cuerpo)
    }
}
