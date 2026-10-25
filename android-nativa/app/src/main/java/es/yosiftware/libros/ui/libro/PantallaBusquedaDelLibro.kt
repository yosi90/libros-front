package es.yosiftware.libros.ui.libro

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Chip
import es.yosiftware.libros.ui.componentes.EstadoDeChip
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import java.util.UUID

private fun iconoDe(categoria: CategoriaDeBusqueda): Int = when (categoria) {
    CategoriaDeBusqueda.CAPITULOS -> Iconos.autoStories
    CategoriaDeBusqueda.PERSONAJES -> Iconos.coPresent
    CategoriaDeBusqueda.ORGANIZACIONES -> Iconos.groups
    CategoriaDeBusqueda.EVENTOS -> Iconos.event
    CategoriaDeBusqueda.LOCALIZACIONES -> Iconos.myLocation
    CategoriaDeBusqueda.CONCEPTOS -> Iconos.autoAwesome
    CategoriaDeBusqueda.CITAS -> Iconos.formatQuote
}

/**
 * La búsqueda dentro del libro (mobile-book-search-view en 5dc3120, con lo de `native-mobile`): arriba, fija, la cuenta
 * de resultados y la barra de búsqueda (al desplazar, con su raya y su sombra); debajo, las categorías, el estado o el
 * aviso de aproximados y los grupos de resultados (en dos columnas desde 600 dp). Al tocar un resultado se abre su
 * capítulo o su elemento.
 */
@Composable
fun PantallaBusquedaDelLibro(libro: LibroViewModel, vm: BusquedaViewModel) {
    val colores = LocalColores.current
    val visita = rememberSaveable { UUID.randomUUID().toString() }
    LaunchedEffect(visita, libro.libro) { vm.entrar(visita, libro.libro) }
    val desplazamiento = rememberScrollState()
    val resultado = vm.resultado
    Column(Modifier.fillMaxSize().background(colores.lienzo)) {
        BarraDeLaBusqueda(vm, resultado.total, desplazada = desplazamiento.value > 0)
        BoxWithConstraints(Modifier.fillMaxSize().verticalScroll(desplazamiento)) {
            val alto = maxHeight
            Column(Modifier.fillMaxWidth().padding(top = Espacios.e4, bottom = Espacios.e8), verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                Row(
                    Modifier.padding(horizontal = Espacios.e3).fillMaxWidth().clip(RoundedCornerShape(0.dp)).horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                ) {
                    CategoriaDeBusqueda.entries.forEach { categoria ->
                        Chip(
                            categoria.etiqueta,
                            estado = if (categoria in vm.activas) EstadoDeChip.Seleccionado else EstadoDeChip.Normal,
                            icono = iconoDe(categoria),
                            tamanoDelIcono = 16.dp,
                            alPulsar = { vm.alternarCategoria(categoria) },
                        )
                    }
                }
                when (resultado.modo) {
                    ModoDeBusqueda.VACIA -> EstadoDeLaBusqueda(Iconos.travelExplore, "Busca en toda la narración", "Escribe para consultar capítulos, escenas y elementos narrativos.", alto.value)
                    ModoDeBusqueda.NINGUNA -> EstadoDeLaBusqueda(Iconos.searchOff, "Sin coincidencias", "No hay resultados en las ${vm.activas.size} categorías activas.", alto.value)
                    ModoDeBusqueda.APROXIMADA, ModoDeBusqueda.EXACTA -> {
                        if (resultado.modo == ModoDeBusqueda.APROXIMADA) Aviso()
                        Resultados(libro, vm, resultado.visibles)
                    }
                }
            }
        }
    }
}

/**
 * `.m-book-search__toolbar`: 8 dp arriba, la cuenta (.7rem, 750, a la derecha) y la barra (`m-scoped-search--bar`: sin
 * borde ni fondo, 16 dp a la izquierda y 8 a la derecha), con el botón de limpiar de 44 dp mientras hay algo escrito.
 */
@Composable
private fun BarraDeLaBusqueda(vm: BusquedaViewModel, total: Int, desplazada: Boolean) {
    val colores = LocalColores.current
    val raya = if (desplazada) mezclar(colores.contornoFuerte, 0.58f) else Color.Transparent
    Column(
        Modifier.fillMaxWidth().background(mezclar(colores.lienzo, 0.96f))
            .drawBehind {
                if (desplazada) drawRect(mezclar(colores.tinta, 0.08f), Offset(0f, size.height), Size(size.width, 6.dp.toPx()))
                drawRect(raya, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx()))
            }
            .padding(top = Espacios.e2),
    ) {
        Box(Modifier.fillMaxWidth().heightIn(min = 24.dp).padding(horizontal = Espacios.e2), contentAlignment = Alignment.CenterEnd) {
            Text("$total resultados", style = Textos.cuerpo.copy(fontSize = rem(0.7), fontWeight = FontWeight(750), color = colores.tintaSuave))
        }
        Row(
            Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(start = Espacios.e4, end = Espacios.e2),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
            BasicTextField(
                value = vm.consulta,
                onValueChange = vm::escribir,
                modifier = Modifier.weight(1f).semantics { contentDescription = "Buscar dentro del libro" },
                singleLine = true,
                textStyle = Textos.cuerpo.copy(color = colores.tinta),
                cursorBrush = SolidColor(colores.primario),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                decorationBox = { campo ->
                    Box {
                        if (vm.consulta.isEmpty()) Text("Personajes, escenas, entradas o conceptos", style = Textos.cuerpo.copy(color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        campo()
                    }
                },
            )
            if (vm.consulta.isNotEmpty()) {
                Box(Modifier.size(44.dp).clip(CircleShape).clickable(onClick = vm::limpiar), contentAlignment = Alignment.Center) {
                    Icon(painterResource(Iconos.close), contentDescription = "Limpiar búsqueda", tint = colores.primario, modifier = Modifier.size(24.dp))
                }
            }
        }
    }
}

/** `.m-book-search__state`: centrado en `min(50dvh, 340px)`, con el icono de 48 dp en el primario y el título en la letra display. */
@Composable
private fun EstadoDeLaBusqueda(icono: Int, titulo: String, texto: String, altoDp: Float) {
    val colores = LocalColores.current
    Column(
        Modifier.padding(horizontal = Espacios.e3).fillMaxWidth().heightIn(min = minOf(altoDp * 0.5f, 340f).dp).padding(Espacios.e6),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(48.dp))
        Text(titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.1), color = colores.tinta, textAlign = TextAlign.Center), modifier = Modifier.padding(top = Espacios.e2))
        Text(texto, style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center), modifier = Modifier.padding(top = Espacios.e2))
    }
}

/** `.m-book-search__notice`: sin coincidencias exactas, en los colores de atención. */
@Composable
private fun Aviso() {
    val colores = LocalColores.current
    Row(
        Modifier.padding(horizontal = Espacios.e3).fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(colores.contenedorAtencion).padding(Espacios.e3),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.autoAwesome), contentDescription = null, tint = colores.atencion, modifier = Modifier.size(24.dp))
        Text("Sin coincidencias exactas; mostramos resultados aproximados.", style = Textos.cuerpo.copy(color = colores.atencion), modifier = Modifier.weight(1f))
    }
}

@Composable
private fun Resultados(libro: LibroViewModel, vm: BusquedaViewModel, grupos: List<GrupoDeResultados>) {
    val columnas = if (LocalVentana.current.anchoDp >= 600f) 2 else 1
    Column(Modifier.padding(horizontal = Espacios.e3).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        grupos.chunked(columnas).forEach { fila ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                fila.forEach { GrupoDeLaBusqueda(libro, vm, it, Modifier.weight(1f).fillMaxHeight()) }
                repeat(columnas - fila.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

/** `.m-book-search-group`: la cabecera que pliega y despliega (icono y nombre, la cuenta en su píldora y la flecha) y sus resultados. */
@Composable
private fun GrupoDeLaBusqueda(libro: LibroViewModel, vm: BusquedaViewModel, grupo: GrupoDeResultados, modifier: Modifier) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    val desplegado = vm.desplegado(grupo.categoria)
    Column(modifier.clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma)) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 60.dp).clickable { vm.alternarGrupo(grupo.categoria) }.padding(horizontal = Espacios.e4, vertical = Espacios.e3),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                Icon(painterResource(iconoDe(grupo.categoria)), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
                Text(grupo.categoria.etiqueta, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Box(Modifier.widthIn(min = 28.dp).clip(Radios.pildora).background(colores.superficieContenedor).padding(horizontal = 8.dp, vertical = 4.dp), contentAlignment = Alignment.Center) {
                Text(grupo.total.toString(), style = Textos.cuerpo.copy(fontSize = rem(0.7), color = colores.primario))
            }
            Box(Modifier.size(32.dp), contentAlignment = Alignment.Center) {
                Icon(painterResource(if (desplegado) Iconos.expandLess else Iconos.expandMore), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(24.dp))
            }
        }
        if (desplegado) {
            Box(Modifier.fillMaxWidth().height(1.dp).background(colores.contorno))
            grupo.resultados.forEachIndexed { i, item ->
                FilaDeResultado(item, ultima = i == grupo.resultados.lastIndex) { libro.ir(item.destino) }
            }
        }
    }
}

/** `.m-book-search-result`: título, subtítulo y hasta tres coincidencias en una línea cada una, con la flecha a la derecha. */
@Composable
private fun FilaDeResultado(item: ResultadoDeBusqueda, ultima: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Column(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 72.dp).clickable(onClick = alPulsar).padding(horizontal = Espacios.e4, vertical = Espacios.e3),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(item.titulo, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta))
                Text(item.subtitulo, style = Textos.cuerpo.copy(fontSize = rem(0.78), color = colores.tintaSuave), modifier = Modifier.padding(top = 4.dp))
                item.coincidencias.take(3).forEach {
                    Text(
                        "${it.campo}: ${it.fragmento}", maxLines = 1, overflow = TextOverflow.Ellipsis,
                        style = Textos.cuerpo.copy(fontSize = rem(0.7), color = colores.tintaSuave), modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            Box(Modifier.size(28.dp), contentAlignment = Alignment.Center) {
                Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(24.dp))
            }
        }
        if (!ultima) Box(Modifier.fillMaxWidth().height(1.dp).background(colores.contorno))
    }
}
