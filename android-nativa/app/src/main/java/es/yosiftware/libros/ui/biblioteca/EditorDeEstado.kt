package es.yosiftware.libros.ui.biblioteca

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Chip
import es.yosiftware.libros.ui.componentes.EstadoDeChip
import es.yosiftware.libros.ui.componentes.rayaAbajo
import es.yosiftware.libros.ui.componentes.rayaArriba
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

/**
 * El editor de estado, puntuación y reseña (collection-state-modal, siempre a pantalla completa). Arriba, «Volver a la
 * biblioteca» y el título; los seis estados en una fila de iconos, con el nombre del elegido debajo; las estrellas y,
 * al puntuar, la caja de la reseña (sin puntuación no se escribe, así que no se enseña); «No compartir esta
 * actualización en Comunidad»; abajo, Volver y Guardar. Sin los rótulos «Mi biblioteca», «Estado» y «Reseña» (ronda 1
 * de interfaz, B3). Atrás vuelve, salvo mientras se guarda.
 */
@Composable
fun EditorDeEstado(
    titulo: String,
    valores: ValoresDeColeccion,
    guardando: Boolean,
    alElegirEstado: (TipoDeEstado) -> Unit,
    alPuntuar: (Int?) -> Unit,
    alEscribirResena: (String) -> Unit,
    alVolver: () -> Unit,
    alGuardar: () -> Unit,
    /** «No compartir esta actualización en Comunidad»: `null` no la enseña (`showActivityControl = false`, las secciones). */
    sinCompartir: Boolean? = null,
    alAlternarSinCompartir: () -> Unit = {},
    /** El `aria-label` de volver: «Volver a la biblioteca» o, en una sección, «Volver a las secciones». */
    etiquetaVolver: String = "Volver a la biblioteca",
    /** Sin estado elegido no se guarda (`requireStatus`); las secciones pueden guardar sin él. */
    exigeEstado: Boolean = true,
) {
    val puedeResenar = valores.puntuacion != null
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val volver = { if (!guardando) alVolver() }
    BackHandler(onBack = volver)

    Column(Modifier.fillMaxSize().background(colores.lienzo).clickable(enabled = false) {}.imePadding()) {
        // La cabecera: volver | el título, centrado | hueco del mismo ancho.
        Row(
            Modifier.fillMaxWidth().background(colores.superficie)
                .rayaAbajo(colores.contorno)
                .padding(
                    start = Espacios.e3 + zona.calculateLeftPadding(direccion),
                    end = Espacios.e3 + zona.calculateRightPadding(direccion),
                    top = Espacios.e2 + zona.calculateTopPadding(),
                    bottom = Espacios.e2,
                )
                .heightIn(min = 48.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier.size(48.dp).clip(CircleShape).border(1.dp, colores.contorno, CircleShape)
                    .clickable(enabled = !guardando, role = Role.Button, onClick = volver)
                    .semantics { contentDescription = etiquetaVolver },
                contentAlignment = Alignment.Center,
            ) {
                Icon(painterResource(Iconos.arrowBack), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
            }
            Text(
                titulo,
                style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.2), fontWeight = FontWeight.SemiBold, lineHeight = 1.18.em, color = colores.tinta, textAlign = TextAlign.Center),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.size(48.dp))
        }

        // El cuerpo, desplazable: con el teclado abierto, la reseña sigue a mano.
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(start = Espacios.e4 + zona.calculateLeftPadding(direccion), end = Espacios.e4 + zona.calculateRightPadding(direccion), top = Espacios.e5, bottom = Espacios.e5),
            verticalArrangement = Arrangement.spacedBy(Espacios.e4),
        ) {
            // Los seis estados, solo con su icono (decisión del propietario), y el nombre del elegido debajo: los chips
            // de solo icono de la ficha, como opciones de un grupo.
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Row(
                    Modifier.fillMaxWidth().semantics { contentDescription = "Estado" }.selectableGroup(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    TipoDeEstado.entries.forEach { estado ->
                        Chip(
                            "",
                            Modifier.weight(1f),
                            estado = if (valores.estado == estado) EstadoDeChip.Seleccionado else EstadoDeChip.Normal,
                            icono = iconoDeEstado(estado),
                            tamanoDelIcono = 22.dp,
                            alPulsar = { alElegirEstado(estado) },
                            descripcion = estado.nombre,
                            rellenoHorizontal = 0.dp,
                            alturaMinima = 48.dp,
                            rol = Role.RadioButton,
                        )
                    }
                }
                // El nombre ya lo dice el estado elegido al lector de pantalla; aquí solo se ve.
                valores.estado?.let {
                    Text(it.nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), modifier = Modifier.clearAndSetSemantics {})
                }
            }

            // Las estrellas (los 44 dp de cada una, con la primera alineada al margen) y, con nota, quitarla.
            val puntuacion = valores.puntuacion
            Row(
                Modifier.offset(x = (-11).dp).semantics { contentDescription = "Puntuación" }.selectableGroup(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                (1..5).forEach { valor ->
                    val llena = puntuacion != null && valor <= puntuacion
                    Box(
                        Modifier.size(44.dp).clip(CircleShape)
                            .selectable(puntuacion == valor, role = Role.RadioButton) { alPuntuar(valor) }
                            .semantics { contentDescription = "$valor de 5" },
                        contentAlignment = Alignment.Center,
                    ) {
                        Estrella(llena, colores.atencion, colores.contornoFuerte, Modifier.size(26.dp))
                    }
                }
                if (puntuacion != null) {
                    Box(
                        Modifier.size(44.dp).clip(CircleShape).clickable { alPuntuar(null) }.semantics { contentDescription = "Quitar puntuación" },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(painterResource(Iconos.close), contentDescription = null, tint = colores.contornoFuerte, modifier = Modifier.size(18.dp))
                    }
                }
            }

            // La reseña aparece al puntuar: sin nota no se escribe, y quitar la nota la vacía.
            AnimatedVisibility(puedeResenar, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
                val forma = RoundedCornerShape(Radios.sm)
                BasicTextField(
                    value = valores.resena,
                    onValueChange = { if (it.length <= 1000) alEscribirResena(it) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 160.dp)
                        .background(colores.superficie, forma)
                        .border(1.dp, colores.contornoFuerte, forma)
                        .padding(12.dp),
                    textStyle = Textos.cuerpo.copy(color = colores.tinta),
                    cursorBrush = SolidColor(colores.primario),
                    decorationBox = { campo ->
                        Box {
                            if (valores.resena.isEmpty()) Text("Añade una reseña personal", style = Textos.cuerpo.copy(color = colores.tintaSuave))
                            campo()
                        }
                    },
                )
            }

            // «No compartir esta actualización en Comunidad».
            if (sinCompartir != null) Row(
                Modifier.heightIn(min = 44.dp).clickable(role = Role.Checkbox, onClick = alAlternarSinCompartir),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Casilla(sinCompartir)
                Text("No compartir esta actualización en Comunidad", style = Textos.cuerpo.copy(fontSize = rem(0.86), color = colores.tintaSuave))
            }
        }

        // El pie: Volver y Guardar, a la derecha.
        Row(
            Modifier.fillMaxWidth().background(colores.superficie)
                .rayaArriba(colores.contorno)
                .padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e3, bottom = Espacios.e3 + zona.calculateBottomPadding()),
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
        ) {
            BotonDelEditor("Volver", primario = false, habilitado = !guardando, alPulsar = volver)
            BotonDelEditor("Guardar", primario = true, habilitado = !guardando && (!exigeEstado || valores.estado != null), alPulsar = alGuardar)
        }
    }
}

/** Los botones del pie: píldoras de 44 dp con 12 dp de relleno; Guardar sobre el primario, y apagados al guardar. */
@Composable
private fun BotonDelEditor(texto: String, primario: Boolean, habilitado: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val (fondo, tinta, borde) = when {
        !habilitado -> Triple(colores.superficieContenedor, mezclar(colores.tintaSuave, 0.55f), colores.contorno)
        primario -> Triple(colores.primario, colores.sobrePrimario, Color.Transparent)
        else -> Triple(Color.Transparent, colores.primario, colores.contorno)
    }
    Box(
        Modifier.heightIn(min = 44.dp).clip(Radios.pildora).background(fondo).border(1.dp, borde, Radios.pildora)
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar)
            .padding(horizontal = 13.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, style = Textos.cuerpo.copy(color = tinta))
    }
}

/** La casilla de 20 dp (`accent-color` del primario): vacía con borde, o llena con la marca. */
@Composable
private fun Casilla(marcada: Boolean) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(3.dp)
    Box(
        Modifier.size(20.dp).clip(forma)
            .background(if (marcada) colores.primario else colores.superficie)
            .border(if (marcada) 0.dp else 1.5.dp, colores.contornoFuerte, forma),
        contentAlignment = Alignment.Center,
    ) {
        if (marcada) Icon(painterResource(Iconos.check), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(16.dp))
    }
}
