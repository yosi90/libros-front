package es.yosiftware.libros.ui.libro

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.datos.rtf.EnlacesNarrativos
import es.yosiftware.libros.datos.rtf.TipoDeEnlace
import es.yosiftware.libros.ui.adaptable.ClaseDeVentana
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.editor.EditorRtf
import es.yosiftware.libros.ui.elementos.ElementosViewModel
import es.yosiftware.libros.ui.tema.Colores
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

/** Los enlaces de las palabras clave del libro (`buildNarrativeEntityLinks`). */
fun enlacesDe(libro: Libro): List<EnlaceNarrativo> = EnlacesNarrativos.construir(buildList {
    libro.personajes.forEach { personaje ->
        add(EnlaceNarrativo(personaje.id, TipoDeEnlace.PERSONAJE, personaje.nombre, personaje.nombre))
        personaje.apodos.forEach { add(EnlaceNarrativo(personaje.id, TipoDeEnlace.PERSONAJE, it.apodo, personaje.nombre)) }
    }
    libro.localizaciones.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.LOCALIZACION, it.nombre, it.nombre)) }
    libro.organizaciones.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.ORGANIZACION, it.nombre, it.nombre)) }
    libro.conceptos.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.CONCEPTO, it.nombre, it.nombre)) }
    libro.eventos.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.EVENTO, it.nombre, it.nombre)) }
    libro.citas.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.CITA, it.nombre, it.nombre)) }
})

/**
 * Las medidas del cuaderno según el ancho: el medianil con los números a la izquierda, el hueco entre columnas y, solo
 * en el ancho expandido, la columna de las apostillas (lugar y reparto) a la derecha; si no, van bajo el texto.
 */
private class Cuaderno(clase: ClaseDeVentana) {
    val alLado = clase == ClaseDeVentana.Expandida
    val compacto = clase == ClaseDeVentana.Compacta
    val medianil = when (clase) {
        ClaseDeVentana.Compacta -> 22.dp
        ClaseDeVentana.Media -> 40.dp
        ClaseDeVentana.Expandida -> 56.dp
    }
    val hueco = if (compacto) Espacios.e2 else Espacios.e5
    val apostillas = 232.dp
    val lados = when (clase) {
        ClaseDeVentana.Compacta -> Espacios.e4
        ClaseDeVentana.Media -> 28.dp
        ClaseDeVentana.Expandida -> Espacios.e7
    }
    val numeroDelCapitulo = when (clase) {
        ClaseDeVentana.Compacta -> 22.sp
        ClaseDeVentana.Media -> 32.sp
        ClaseDeVentana.Expandida -> 40.sp
    }
    val tituloDelCapitulo = when (clase) {
        ClaseDeVentana.Compacta -> 24.sp
        ClaseDeVentana.Media -> 28.sp
        ClaseDeVentana.Expandida -> 32.sp
    }
}

/**
 * El capítulo como cuaderno («Cuaderno», F5, el clon de la F2 de la web): arriba, su número al margen, su título y sus
 * páginas, con el lápiz de sus datos; debajo, cada escena entera en serif, con su número al margen y, como apostillas,
 * el lugar y el reparto. Tocar una escena la abre para escribir (una a la vez), con el cursor donde se tocó; los enlaces
 * del texto siguen abriendo su elemento. El reparto se cambia con el «+» ([HojaDeReparto]) o la @ del texto
 * ([SugerenciasDeMencion]); el lugar, en su hoja ([HojaDeLugar]), que también lo crea. Lo escrito se guarda solo
 * ([CapituloViewModel]), también un capítulo nuevo; al pasar a segundo plano o salir de la vista, en el acto.
 */
@Composable
fun PantallaCapitulo(libroVm: LibroViewModel, vista: VistaDelLibro, vm: CapituloViewModel, personajes: ElementosViewModel) {
    val colores = LocalColores.current
    val libro = libroVm.libro ?: return
    LaunchedEffect(libro) {
        vm.abrir(libro, vista)
        personajes.prepararAltaDesdeLaEscena(libro)
    }
    vm.alGuardar = libroVm::ponerCapitulo
    vm.alCrearLugar = { lugar -> libroVm.libro?.let { actual -> if (actual.localizaciones.none { it.id == lugar.id }) libroVm.recibirLibro(actual.copy(localizaciones = actual.localizaciones + lugar)) } }
    personajes.alGuardar = libroVm::recibirLibro
    val ciclo = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(vm, ciclo) {
        val observador = LifecycleEventObserver { _, evento -> if (evento == Lifecycle.Event.ON_STOP) vm.guardarAhora() }
        ciclo.addObserver(observador)
        onDispose {
            ciclo.removeObserver(observador)
            vm.guardarAhora()
        }
    }
    val capitulo = vm.capitulo ?: return
    val enlaces = remember(libro) { enlacesDe(libro) }
    val cuaderno = Cuaderno(LocalVentana.current.clase)
    val creador = remember(vm, personajes) { CreadorDePersonajes(personajes) }
    Box(Modifier.fillMaxSize().background(colores.superficie)) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .padding(horizontal = cuaderno.lados, vertical = if (cuaderno.compacto) Espacios.e4 else 28.dp)
                .padding(bottom = Espacios.e6),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(Modifier.widthIn(max = 1060.dp).fillMaxWidth()) {
                CabeceraDelCapitulo(libroVm, vm, capitulo, cuaderno)
                capitulo.escenas.forEachIndexed { i, escena ->
                    val abierta = escena.clave == vm.escenaAbierta
                    // La raya de arriba, salvo junto a la escena abierta (que ya tiene su fondo).
                    val raya = !abierta && capitulo.escenas.getOrNull(i - 1)?.clave != vm.escenaAbierta
                    Escena(libroVm, vm, libro, escena, i + 1, abierta, raya, enlaces, creador, cuaderno)
                }
                Carril(
                    cuaderno,
                    Modifier.raya(colores, capitulo.escenas.lastOrNull()?.clave != vm.escenaAbierta).padding(top = 10.dp),
                    numero = { Text((capitulo.escenas.size + 1).toString(), style = estiloDeNumeroDeEscena(colores.tintaSuave).copy(lineHeight = 36.sp)) },
                ) {
                    BotonDeTexto("Escena", Iconos.add) { vm.anadirEscena() }
                }
            }
        }
    }
    vm.repartoDe?.let { clave -> capitulo.escenas.firstOrNull { it.clave == clave } }.let { escena -> HojaDeReparto(vm, libro, escena, creador) }
    vm.lugarDe?.let { clave -> capitulo.escenas.firstOrNull { it.clave == clave } }.let { escena -> HojaDeLugar(vm, escena) }
    creador.Confirmacion()
}

/**
 * Una fila del cuaderno (`.lane`): el número al margen, alineado a la derecha; el texto y, debajo o (en el ancho
 * expandido) a su derecha, las apostillas.
 */
@Composable
private fun Carril(
    cuaderno: Cuaderno,
    modifier: Modifier = Modifier,
    numero: @Composable () -> Unit,
    apostillas: (@Composable () -> Unit)? = null,
    texto: @Composable ColumnScope.() -> Unit,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(cuaderno.hueco)) {
        Box(Modifier.width(cuaderno.medianil), contentAlignment = Alignment.TopEnd) { numero() }
        Column(Modifier.weight(1f)) {
            texto()
            if (!cuaderno.alLado && apostillas != null) {
                Spacer(Modifier.height(10.dp))
                apostillas()
            }
        }
        if (cuaderno.alLado) Box(Modifier.width(cuaderno.apostillas).padding(top = 2.dp)) { apostillas?.invoke() }
    }
}

/** La raya de 1 dp encima (`border-top`), si [con]. */
private fun Modifier.raya(colores: Colores, con: Boolean = true): Modifier =
    if (!con) this else drawBehind { drawRect(colores.contorno, Offset.Zero, Size(size.width, 1.dp.toPx())) }

private fun estiloDeNumeroDeEscena(color: Color) =
    Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, lineHeight = 27.sp, color = color, fontFeatureSettings = "tnum")

/**
 * La cabecera del capítulo: su número al margen, en el acento; su título en serif y sus páginas con el lápiz, que
 * despliega sus datos (solos en un capítulo nuevo o con algún dato mal). El estado del guardado, a la derecha o debajo.
 */
@Composable
private fun CabeceraDelCapitulo(libroVm: LibroViewModel, vm: CapituloViewModel, capitulo: CapituloEditable, cuaderno: Cuaderno) {
    val colores = LocalColores.current
    val conErrores = listOf(
        ReglasDelCapitulo.errorDeNombre(capitulo.nombre), ReglasDelCapitulo.errorDePagina(capitulo.pagina),
        ReglasDelCapitulo.errorDePaginaFinal(capitulo.paginaFinal), ReglasDelCapitulo.errorDeOrden(capitulo.orden),
    ).any { it != null }
    val conDatos = capitulo.esNuevo || conErrores || libroVm.datosDelCapitulo
    val estado: @Composable () -> Unit = { if (vm.estado != EstadoDelGuardado.NADA) IndicadorDeGuardado(vm.estado) }
    Carril(
        cuaderno,
        Modifier.padding(bottom = 20.dp),
        numero = {
            Text(
                capitulo.orden.trim(),
                style = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = cuaderno.numeroDelCapitulo, fontWeight = FontWeight.SemiBold, lineHeight = 1.15.em, color = colores.acento, fontFeatureSettings = "tnum"),
                modifier = Modifier.clearAndSetSemantics {},
            )
        },
        apostillas = { if (cuaderno.alLado) Box(Modifier.padding(top = Espacios.e2)) { estado() } },
    ) {
        if (!conDatos) {
            Text(
                capitulo.nombre.trim().ifEmpty { "Capítulo ${capitulo.orden}" },
                style = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = cuaderno.tituloDelCapitulo, fontWeight = FontWeight.SemiBold, lineHeight = 1.15.em, color = colores.tinta),
                modifier = Modifier.semantics { heading() },
            )
            Row(Modifier.heightIn(min = 36.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e1)) {
                ReglasDelCapitulo.paginas(capitulo)?.let { Text(it, style = Textos.cuerpo.copy(fontSize = 13.5.sp, color = colores.tintaSuave, fontFeatureSettings = "tnum")) }
                BotonDeIconoPequeno(Iconos.edit, "Editar los datos del capítulo ${capitulo.orden}", alPulsar = libroVm::alternarDatosDelCapitulo)
            }
        } else {
            CamposDelCapitulo(vm, capitulo)
            if (!capitulo.esNuevo && !conErrores) BotonDeTexto("Hecho", alPulsar = libroVm::alternarDatosDelCapitulo)
        }
        if (!cuaderno.alLado) Box(Modifier.padding(top = Espacios.e1)) { estado() }
    }
}

/** Los datos del capítulo: el título y, debajo, las páginas y el número, de 520 dp como mucho. */
@Composable
private fun CamposDelCapitulo(vm: CapituloViewModel, capitulo: CapituloEditable) {
    var tocados by remember { mutableStateOf(emptySet<String>()) }
    val tocar = { campo: String -> tocados = tocados + campo }
    Column(Modifier.widthIn(max = 520.dp).fillMaxWidth().padding(bottom = Espacios.e2), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        val errorDeNombre = ReglasDelCapitulo.errorDeNombre(capitulo.nombre)
        CampoNativo(
            "Título", capitulo.nombre, { valor -> vm.cambiar { it.copy(nombre = valor.take(200)) } }, Modifier.fillMaxWidth(),
            seleccionarSiEs = "Capítulo ${capitulo.orden}",
            nota = if (errorDeNombre != null && "nombre" in tocados) errorDeNombre else "${capitulo.nombre.length} / 200".takeIf { capitulo.nombre.length >= 180 },
            notaEsError = errorDeNombre != null && "nombre" in tocados,
            alSalir = { tocar("nombre") },
            nombreAccesible = "Título del capítulo",
        )
        Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            CampoNativo("Pág. inicial", capitulo.pagina, { valor -> vm.cambiar { it.copy(pagina = valor.filter(Char::isDigit)) } }, Modifier.weight(1f), numerico = true,
                nota = ReglasDelCapitulo.errorDePagina(capitulo.pagina)?.takeIf { "pagina" in tocados }, notaEsError = true,
                alSalir = {
                    tocar("pagina")
                    // `syncEndPageFromStart`: si la final queda vacía o por debajo, pasa a ser la inicial.
                    vm.cambiar { c -> if (ReglasDelCapitulo.errorDePagina(c.pagina) == null && (c.paginaFinal.isEmpty() || (c.paginaFinal.toIntOrNull() ?: 0) < c.pagina.toInt())) c.copy(paginaFinal = c.pagina) else c }
                })
            CampoNativo("Pág. final", capitulo.paginaFinal, { valor -> vm.cambiar { it.copy(paginaFinal = valor.filter(Char::isDigit)) } }, Modifier.weight(1f), numerico = true,
                nota = ReglasDelCapitulo.errorDePaginaFinal(capitulo.paginaFinal)?.takeIf { "paginaFinal" in tocados }, notaEsError = true,
                alSalir = {
                    tocar("paginaFinal")
                    // `syncStartPageFromEnd`: si la inicial queda vacía o por encima, pasa a ser la final.
                    vm.cambiar { c -> if (c.paginaFinal.isNotEmpty() && ReglasDelCapitulo.errorDePaginaFinal(c.paginaFinal) == null && (c.pagina.isEmpty() || (c.pagina.toIntOrNull() ?: 0) > c.paginaFinal.toInt())) c.copy(pagina = c.paginaFinal) else c }
                })
            CampoNativo("Número", capitulo.orden, { valor -> vm.cambiar { it.copy(orden = valor.filter(Char::isDigit)) } }, Modifier.weight(1f), numerico = true,
                nota = ReglasDelCapitulo.errorDeOrden(capitulo.orden)?.takeIf { "orden" in tocados }, notaEsError = true, alSalir = { tocar("orden") })
        }
    }
}

/**
 * Una escena: su número al margen; su título y su texto enteros, en serif, que al tocarlos la abren para escribir; o,
 * abierta, el título como campo, el «⋯» con «Eliminar» y el editor con su barra. Lo que le falta, debajo. Las
 * apostillas: el lugar, el reparto, «Mismo reparto que la escena N» y el «+».
 */
@Composable
private fun Escena(
    libroVm: LibroViewModel, vm: CapituloViewModel, libro: Libro, escena: EscenaEditable, numero: Int, abierta: Boolean,
    raya: Boolean, enlaces: List<EnlaceNarrativo>, creador: CreadorDePersonajes, cuaderno: Cuaderno,
) {
    val colores = LocalColores.current
    val alAbrirEnlace = libroVm::abrirEnlace
    val fondo = if (abierta) Modifier.bloqueAbierto(colores.lienzo, cuaderno.compacto) else Modifier.raya(colores, raya).padding(vertical = 18.dp)
    Carril(
        cuaderno,
        Modifier.then(fondo).semantics { contentDescription = "Escena $numero" },
        numero = { Text(numero.toString(), style = estiloDeNumeroDeEscena(colores.acento), modifier = Modifier.clearAndSetSemantics {}) },
        apostillas = { Apostillas(vm, libro, escena, numero, cuaderno) },
    ) {
        val falta = ReglasDelCapitulo.loQueFalta(escena)
        if (abierta) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                CampoDeTitulo(
                    escena.clave, escena.nombre, { nuevo -> vm.cambiarEscena(escena.clave) { it.copy(nombre = nuevo) } },
                    ejemplo = "Título de la escena", descripcion = "Título de la escena $numero", porDefecto = "Escena $numero", modifier = Modifier.weight(1f),
                )
                MenuDeEliminar("Más: eliminar la escena $numero", "Eliminar la escena") { vm.quitarEscena(escena.clave) }
            }
            EditorRtf(
                valor = escena.descripcion,
                alCambiar = { nuevo -> vm.cambiarEscena(escena.clave) { it.copy(descripcion = nuevo) } },
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                enlaces = enlaces,
                alAbrirEnlace = alAbrirEnlace,
                idLibro = libroVm.abierto?.id,
                descripcion = "Texto de la escena $numero",
                seleccionarTodoAlEnfocar = ReglasDelCapitulo.esDescripcionPorDefecto(escena.descripcion),
                alTerminarDeEditar = vm::guardarAhora,
                // La barra se queda mientras la escena está abierta: esconderla al perder el foco movería lo de debajo.
                barraSoloAlEscribir = false,
                menciones = { consulta, sustituir -> SugerenciasDeMencion(vm, libro, escena, creador, consulta, sustituir) },
                cursorAlMontar = vm.cursorAlAbrir,
                alPonerElCursor = vm::cursorPuesto,
            )
        } else {
            TituloLeido(escena.nombre.ifBlank { "Escena $numero" }, "Escribir en la escena $numero") { vm.abrirEscena(escena.clave) }
            Box(Modifier.padding(top = 6.dp)) {
                if (ReglasDelCapitulo.textoPlano(escena).isNotEmpty()) {
                    TextoLeido(escena.descripcion, enlaces, alAbrirEnlace, "Texto de la escena $numero") { posicion -> vm.abrirEscena(escena.clave, posicion) }
                } else {
                    Text(
                        "Qué pasa en esta escena",
                        style = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontStyle = FontStyle.Italic, fontSize = 16.5.sp, lineHeight = 1.62.em, color = colores.tintaSuave),
                        modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClickLabel = "Escribir en la escena $numero") { vm.abrirEscena(escena.clave) },
                    )
                }
            }
        }
        if (falta != null && (abierta || escena.tocada)) {
            Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(painterResource(Iconos.errorOutline), contentDescription = null, tint = colores.atencion, modifier = Modifier.size(16.dp))
                Text(falta, style = Textos.cuerpo.copy(fontSize = 13.sp, color = colores.atencion))
            }
        }
    }
}

/**
 * Las apostillas de una escena: el lugar (que abre su hoja), los personajes (al tocarlos, en escena o solo nombrado, o
 * quitarlos), «Mismo reparto que la escena N» y el «+» del reparto. Al lado, en columna y en texto; debajo, en una
 * fila que salta de línea, como fichas de 36 dp.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Apostillas(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable, numero: Int, cuaderno: Cuaderno) {
    val colores = LocalColores.current
    val alto = if (cuaderno.alLado) 28.dp else 36.dp
    val neutra = ReglasDelCapitulo.localizacionNeutra(libro)
    val lugar = libro.localizaciones.firstOrNull { it.id == escena.idLocalizacion }?.nombre
    val conLugar = lugar != null && escena.idLocalizacion != neutra
    val lugarDeLaEscena: @Composable () -> Unit = {
        Row(
            Modifier.heightIn(min = alto).clip(RoundedCornerShape(Radios.sm)).clickable(role = Role.Button) { vm.abrirLugar(escena.clave) }
                .semantics(mergeDescendants = true) { contentDescription = "Lugar de la escena $numero: ${lugar ?: "Sin localización"}" }
                .padding(end = Espacios.e1),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val color = if (conLugar) colores.tintaSuave else colores.tintaSuave.copy(alpha = 0.75f)
            Icon(painterResource(Iconos.place), contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
            Text(lugar ?: "Sin localización", style = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = FontWeight.Medium, color = color), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
    val personajes: @Composable () -> Unit = {
        ordenDeFichas(libro, escena.personajes).forEach { personaje -> ApostillaDePersonaje(vm, libro, escena, personaje, enFicha = !cuaderno.alLado) }
    }
    val acciones: @Composable () -> Unit = {
        vm.mismoRepartoQue(escena.clave)?.let { anterior ->
            Box(
                Modifier.heightIn(min = alto).clip(RoundedCornerShape(Radios.sm)).background(colores.superficieContenedor)
                    .clickable(role = Role.Button) { vm.copiarRepartoAnterior(escena.clave) }.padding(horizontal = Espacios.e2),
                contentAlignment = Alignment.Center,
            ) { Text("Mismo reparto que la escena $anterior", style = Textos.cuerpo.copy(fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = colores.tinta)) }
        }
        Box(
            Modifier.size(maxOf(alto, 40.dp)).clip(CircleShape).clickable(role = Role.Button) { vm.abrirReparto(escena.clave) }
                .semantics { contentDescription = "Añadir personaje a la escena $numero" },
            contentAlignment = Alignment.Center,
        ) {
            Box(Modifier.size(alto).border(1.dp, colores.contornoFuerte, CircleShape), contentAlignment = Alignment.Center) {
                Icon(painterResource(Iconos.add), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
            }
        }
    }
    if (cuaderno.alLado) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            lugarDeLaEscena()
            if (escena.personajes.isNotEmpty()) Column { personajes() }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), itemVerticalAlignment = Alignment.CenterVertically) { acciones() }
        }
    } else {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp), itemVerticalAlignment = Alignment.CenterVertically) {
            lugarDeLaEscena()
            personajes()
            acciones()
        }
    }
}

/** Los personajes de una escena como se enseñan: primero los presentes y después los nombrados, cada grupo por nombre. */
internal fun ordenDeFichas(libro: Libro, personajes: List<PersonajeEnEscena>): List<PersonajeEnEscena> =
    ReglasDelCapitulo.ordenarPersonajes(personajes) { ReglasDelCapitulo.nombreDePersonaje(libro, it) }.sortedBy { it.nombrado }

/**
 * Un personaje de la escena: su nombre («@ Nombre» en cursiva si solo se le nombra), en texto al lado o como ficha
 * debajo ([enFicha]); al tocarlo, pasarlo a solo nombrado (o a en escena) o quitarlo.
 */
@Composable
private fun ApostillaDePersonaje(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable, personaje: PersonajeEnEscena, enFicha: Boolean) {
    val colores = LocalColores.current
    val nombre = ReglasDelCapitulo.nombreDePersonaje(libro, personaje.id)
    var abierto by remember { mutableStateOf(false) }
    Box {
        val forma = RoundedCornerShape(18.dp)
        val ficha = when {
            !enFicha -> Modifier.heightIn(min = 26.dp)
            personaje.nombrado -> Modifier.heightIn(min = 36.dp).border(1.dp, colores.contornoFuerte, forma).padding(horizontal = Espacios.e3)
            else -> Modifier.heightIn(min = 36.dp).clip(forma).background(colores.superficieContenedor).padding(horizontal = Espacios.e3)
        }
        Box(
            Modifier.clip(if (enFicha) forma else RoundedCornerShape(Radios.sm)).clickable(role = Role.Button) { abierto = true }
                .semantics { contentDescription = "Cambiar o quitar a $nombre" }.then(ficha),
            contentAlignment = Alignment.CenterStart,
        ) {
            Text(
                if (personaje.nombrado) "@ $nombre" else nombre,
                style = Textos.cuerpo.copy(
                    fontSize = 13.5.sp, lineHeight = 1.3.em,
                    color = if (personaje.nombrado) colores.tintaSuave else colores.tinta,
                    fontStyle = if (personaje.nombrado) FontStyle.Italic else FontStyle.Normal,
                ),
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
            DropdownMenuItem(
                text = { Text(if (personaje.nombrado) "En escena" else "Solo nombrado", style = Textos.cuerpo.copy(color = colores.tinta)) },
                leadingIcon = { Icon(painterResource(if (personaje.nombrado) Iconos.person else Iconos.alternateEmail), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(20.dp)) },
                onClick = { abierto = false; vm.asignarPersonaje(escena.clave, personaje.id, !personaje.nombrado) },
            )
            DropdownMenuItem(
                text = { Text("Quitar", style = Textos.cuerpo.copy(color = colores.error)) },
                leadingIcon = { Icon(painterResource(Iconos.close), contentDescription = null, tint = colores.error, modifier = Modifier.size(20.dp)) },
                onClick = { abierto = false; vm.quitarPersonaje(escena.clave, personaje.id) },
            )
        }
    }
}

/**
 * La hoja del lugar de [escena] (`null`: cerrada): el buscador con la X, las localizaciones del libro (la de la escena
 * arriba y marcada) y, al final, «Crear «…»», que la crea y la elige.
 */
@Composable
private fun HojaDeLugar(vm: CapituloViewModel, escena: EscenaEditable?) {
    val colores = LocalColores.current
    var buscado by remember(escena?.clave) { mutableStateOf("") }
    HojaInferior(abierta = escena != null, alCerrar = vm::cerrarLugar, titulo = "Lugar") {
        if (escena == null) return@HojaInferior
        Row(
            Modifier.fillMaxWidth().padding(start = Espacios.e5, end = Espacios.e2),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e1),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CampoNativo(
                etiqueta = null, valor = buscado, alCambiar = { buscado = it }, modifier = Modifier.weight(1f),
                ejemplo = "Buscar o crear", iconoFinal = Iconos.search, nombreAccesible = "Buscar o crear localización",
            )
            BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarLugar)
        }
        Column(
            Modifier.fillMaxWidth().padding(start = Espacios.e4, end = Espacios.e3, top = Espacios.e2, bottom = Espacios.e4)
                .heightIn(max = 480.dp).verticalScroll(rememberScrollState()),
        ) {
            vm.opcionesDeLugar(escena, buscado).forEach { lugar ->
                val elegido = lugar.id == escena.idLocalizacion
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(RoundedCornerShape(Radios.sm))
                        .background(if (elegido) colores.superficieContenedor else Color.Transparent)
                        .clickable(role = Role.Button) { vm.elegirLocalizacion(escena.clave, lugar.id); vm.cerrarLugar() }
                        .semantics { selected = elegido }
                        .padding(horizontal = Espacios.e2),
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(lugar.nombre, style = Textos.cuerpo.copy(fontSize = 14.sp, fontWeight = if (elegido) FontWeight.SemiBold else FontWeight.Normal, color = colores.tinta), modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (elegido) Icon(painterResource(Iconos.check), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
                }
            }
            vm.lugarParaCrear(buscado)?.let { nombre ->
                val ocupado = vm.creandoLugar != null
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 44.dp).alpha(if (ocupado) 0.5f else 1f)
                        .clickable(enabled = !ocupado, role = Role.Button) { vm.crearLugar(escena.clave, buscado) }
                        .padding(horizontal = Espacios.e2),
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CirculoDeCrear(28.dp)
                    Text(if (vm.creandoLugar == nombre) "Creando «$nombre»…" else "Crear «$nombre»", style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.primario), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

/**
 * `.m-native-field`: la etiqueta (`.72rem`, 800, tinta suave), el campo de 44 dp (borde del contorno fuerte, radio
 * pequeño, superficie; con el foco, borde del primario y halo) y la nota de debajo (`.68rem`, 600; en rojo si es error).
 * Al enfocarlo, si su texto es [seleccionarSiEs] (el de por defecto), se selecciona entero (`selectDefaultText`).
 */
@Composable
internal fun CampoNativo(
    etiqueta: String?,
    valor: String,
    alCambiar: (String) -> Unit,
    modifier: Modifier,
    numerico: Boolean = false,
    seleccionarSiEs: String? = null,
    nota: String? = null,
    notaEsError: Boolean = false,
    ejemplo: String? = null,
    @DrawableRes iconoFinal: Int? = null,
    habilitado: Boolean = true,
    alEnfocar: () -> Unit = {},
    alSalir: () -> Unit = {},
    /** Para el lector de pantalla, si no lleva etiqueta. */
    nombreAccesible: String? = null,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val interaccion = remember { MutableInteractionSource() }
    val enfocado by interaccion.collectIsFocusedAsState()
    var campo by remember { mutableStateOf(TextFieldValue(valor)) }
    if (campo.text != valor) campo = campo.copy(text = valor, selection = TextRange(minOf(campo.selection.start, valor.length), minOf(campo.selection.end, valor.length)))
    var teniaFoco by remember { mutableStateOf(false) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (etiqueta != null) Text(etiqueta, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
        BasicTextField(
            value = campo,
            onValueChange = { nuevo ->
                campo = nuevo
                if (nuevo.text != valor) alCambiar(nuevo.text)
            },
            enabled = habilitado,
            singleLine = true,
            textStyle = Textos.cuerpo.copy(fontSize = rem(0.795), fontWeight = FontWeight.Medium, lineHeight = 1.2.em, color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(keyboardType = if (numerico) KeyboardType.Number else KeyboardType.Text),
            interactionSource = interaccion,
            modifier = Modifier.fillMaxWidth()
                .semantics { (etiqueta ?: nombreAccesible)?.let { contentDescription = it } }
                .onFocusChanged { estado ->
                    if (estado.isFocused && !teniaFoco) {
                        alEnfocar()
                        if (seleccionarSiEs != null && valor == seleccionarSiEs) campo = campo.copy(selection = TextRange(0, valor.length))
                    }
                    if (!estado.isFocused && teniaFoco) alSalir()
                    teniaFoco = estado.isFocused
                },
            decorationBox = { interior ->
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 44.dp)
                        .drawBehind {
                            if (enfocado) drawRoundRect(mezclar(colores.primario, 0.18f), Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), androidx.compose.ui.geometry.CornerRadius(Radios.sm.toPx() + 2.dp.toPx()))
                        }
                        .background(colores.superficie, forma)
                        .border(1.dp, if (enfocado) colores.primario else colores.contornoFuerte, forma)
                        .padding(start = Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.weight(1f).padding(end = if (iconoFinal == null) Espacios.e2 else 0.dp)) {
                        if (valor.isEmpty() && ejemplo != null) Text(ejemplo, style = Textos.cuerpo.copy(fontSize = rem(0.775), color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        interior()
                    }
                    if (iconoFinal != null) Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) {
                        Icon(painterResource(iconoFinal), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
                    }
                }
            },
        )
        if (nota != null) Text(nota, style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.SemiBold, color = if (notaEsError) colores.error else colores.tintaSuave))
    }
}
