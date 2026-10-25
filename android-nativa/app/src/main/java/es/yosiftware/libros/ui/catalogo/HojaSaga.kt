package es.yosiftware.libros.ui.catalogo

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.EnlaceDeSaga
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.biblioteca.etiquetaDeEnlace
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

// La ficha de una saga del catálogo (app-catalog-saga-sheet de 5dc3120), a pantalla completa en la APK: su universo y su
// autoría, la cadena de lectura («Continúa a» y «Continúa en», que abren la saga de al lado) y sus títulos. Las medidas
// del Sass van en px: aquí, en rem de 16 px.

private fun px(valor: Int) = rem(valor / 16.0)

@Composable
fun HojaDeSagaDelCatalogo(vm: CatalogoViewModel, hoja: HojaDeSaga) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val saga = hoja.saga
    BackHandler(onBack = vm::cerrarSaga)

    Column(
        Modifier.fillMaxSize().background(colores.superficie).clickable(enabled = false) {}
            .padding(top = zona.calculateTopPadding(), bottom = zona.calculateBottomPadding()),
    ) {
        Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f)) {
                Text("SAGA", style = Textos.cuerpo.copy(fontSize = px(12), fontWeight = FontWeight.Bold, letterSpacing = 0.06.em, color = colores.primario), modifier = Modifier.padding(bottom = 4.dp))
                Text(
                    buildAnnotatedString {
                        append(saga?.nombre ?: "Saga")
                        if (!saga?.subtitulo.isNullOrEmpty()) withStyle(SpanStyle(fontSize = px(16), color = mezclar(colores.tinta, 0.75f))) { append(" · ${saga?.subtitulo}") }
                    },
                    style = Textos.cuerpo.copy(fontSize = px(22), lineHeight = 1.2.em, color = colores.tinta),
                )
            }
            BotonDeIcono(Iconos.close, "Cerrar la ficha de la saga", vm::cerrarSaga)
        }

        val estado = Textos.cuerpo.copy(color = colores.tinta)
        when {
            hoja.cargando -> Text("Cargando la saga…", style = estado, modifier = Modifier.padding(20.dp).alpha(0.8f))
            hoja.fallo -> Text("No se pudo cargar la saga. Inténtalo de nuevo más tarde.", style = estado, modifier = Modifier.padding(20.dp).alpha(0.8f))
            saga != null -> Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(start = 20.dp, end = 20.dp, bottom = 24.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    saga.universo?.let { DatoDeSaga("Universo", it.nombre) }
                    saga.autores.joinToString(", ") { it.nombre }.takeIf { it.isNotEmpty() }?.let { DatoDeSaga("Autoría", it) }
                }
                if (saga.cadena.previas.isNotEmpty() || saga.cadena.siguientes.isNotEmpty()) Cadena(saga, vm::abrirSaga)
                val total = hoja.obras.size
                Text(
                    "$total ${if (total == 1) "título" else "títulos"}".uppercase(),
                    style = Textos.cuerpo.copy(fontSize = px(13), fontWeight = FontWeight.Bold, letterSpacing = 0.04.em, color = colores.tinta),
                    modifier = Modifier.padding(top = 20.dp, bottom = 8.dp).alpha(0.8f),
                )
                if (hoja.obras.isEmpty()) {
                    Text("Esta saga aún no tiene títulos en el catálogo.", style = estado, modifier = Modifier.padding(20.dp).alpha(0.8f))
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        hoja.obras.forEach { obra -> FilaDeObra(obra) { vm.abrirObraDeSaga(obra) } }
                    }
                }
            }
        }
    }
}

/** Una fila de `.sheet__meta`: 88 dp para el nombre y el resto para el valor. */
@Composable
private fun DatoDeSaga(nombre: String, valor: String) {
    val colores = LocalColores.current
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(nombre, style = Textos.cuerpo.copy(fontSize = px(13), color = colores.tinta), modifier = Modifier.width(88.dp).alpha(0.7f))
        Text(valor, style = Textos.cuerpo.copy(fontSize = px(14), color = colores.tinta), modifier = Modifier.weight(1f))
    }
}

/** `.sheet__chain`: sobre el contenedor de la superficie, las sagas de antes y de después como píldoras. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Cadena(saga: Saga, alAbrir: (Int) -> Unit) {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth().padding(top = 16.dp).clip(RoundedCornerShape(10.dp)).background(colores.superficieContenedor).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        val fila: @Composable (String, List<EnlaceDeSaga>, Boolean) -> Unit = { rotulo, enlaces, adelante ->
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp), itemVerticalAlignment = Alignment.CenterVertically) {
                Text(rotulo, style = Textos.cuerpo.copy(fontSize = px(13), fontWeight = FontWeight.SemiBold, color = colores.tinta), modifier = Modifier.widthIn(min = 88.dp))
                enlaces.forEach { enlace ->
                    Row(
                        Modifier.heightIn(min = 40.dp).clip(Radios.pildora).background(mezclar(colores.primario, 0.14f))
                            .clickable { alAbrir(enlace.id) }
                            .padding(horizontal = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        val letra = Textos.cuerpo.copy(fontSize = px(14), fontWeight = FontWeight.SemiBold, color = colores.primario)
                        if (!adelante) Icon(painterResource(Iconos.arrowBack), contentDescription = null, tint = colores.primario, modifier = Modifier.size(16.dp))
                        Text(etiquetaDeEnlace(enlace, saga), style = letra)
                        if (adelante) Icon(painterResource(Iconos.arrowForward), contentDescription = null, tint = colores.primario, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
        if (saga.cadena.previas.isNotEmpty()) fila("Continúa a", saga.cadena.previas, false)
        if (saga.cadena.siguientes.isNotEmpty()) fila("Continúa en", saga.cadena.siguientes, true)
    }
}

/** Una obra de la saga: portada de 36 × 54, nombre, tipo y si es de la persona, y la flecha. */
@Composable
private fun FilaDeObra(obra: Obra, alAbrir: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(8.dp)).clickable(onClick = alAbrir).padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Portada(obra.portada, null, Modifier.width(36.dp).height(54.dp).clip(RoundedCornerShape(3.dp)))
        Column(Modifier.weight(1f)) {
            Text(obra.nombre, style = Textos.cuerpo.copy(fontSize = px(15), fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                (if (obra.esAntologia) "Antología" else "Libro") + if (Catalogo.estaEnColeccion(obra)) " · En tu biblioteca" else "",
                style = Textos.cuerpo.copy(fontSize = px(12), color = colores.tinta),
                modifier = Modifier.alpha(0.7f),
            )
        }
        Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(24.dp).alpha(0.6f))
    }
}
