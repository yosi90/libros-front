package es.yosiftware.libros.ui.libro

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
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
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import androidx.compose.ui.window.PopupProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.datos.rtf.EnlacesNarrativos
import es.yosiftware.libros.datos.rtf.TipoDeEnlace
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.editor.EditorRtf
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2
import java.text.Collator
import java.util.Locale

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

private fun elementoDe(tipo: TipoDeEnlace): Elemento = when (tipo) {
    TipoDeEnlace.PERSONAJE -> Elemento.PERSONAJES
    TipoDeEnlace.LOCALIZACION -> Elemento.LOCALIZACIONES
    TipoDeEnlace.ORGANIZACION -> Elemento.ORGANIZACIONES
    TipoDeEnlace.CONCEPTO -> Elemento.CONCEPTOS
    TipoDeEnlace.EVENTO -> Elemento.EVENTOS
    TipoDeEnlace.CITA -> Elemento.CITAS
}

private val porNombre: Collator = Collator.getInstance(Locale.forLanguageTag("es")).apply { strength = Collator.PRIMARY }

/**
 * El capítulo con sus escenas (mobile-chapter-view en 5dc3120): el título, las páginas y el orden; cada escena con su
 * título, su localización, su texto en el editor RTF y sus personajes (presentes y solo nombrados); y, en un capítulo
 * nuevo, «Guardar capítulo». Lo escrito se guarda solo ([CapituloViewModel]); al pasar a segundo plano o salir de la
 * vista, en el acto.
 */
@Composable
fun PantallaCapitulo(libroVm: LibroViewModel, vista: VistaDelLibro, vm: CapituloViewModel) {
    val colores = LocalColores.current
    val libro = libroVm.libro ?: return
    LaunchedEffect(libro) { vm.abrir(libro, vista) }
    vm.alGuardar = libroVm::ponerCapitulo
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
    val ancha = LocalVentana.current.anchoDp >= 600f
    Box(Modifier.fillMaxSize().background(colores.lienzo)) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .padding(start = if (ancha) Espacios.e6 else Espacios.e4, end = if (ancha) Espacios.e6 else Espacios.e4, top = if (ancha) Espacios.e6 else Espacios.e5, bottom = if (ancha) Espacios.e6 else Espacios.e8),
            verticalArrangement = Arrangement.spacedBy(Espacios.e5),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(Modifier.widthIn(max = 1040.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e5)) {
                CamposDelCapitulo(vm, capitulo, ancha)
                Escenas(libroVm, vm, libro, capitulo, enlaces, ancha)
                if (capitulo.esNuevo) Box(Modifier.heightIn(min = 56.dp))
            }
        }
        if (capitulo.esNuevo) {
            // `.m-chapter__save`: fijo abajo, a la derecha, con su sombra.
            Box(Modifier.align(Alignment.BottomEnd).padding(end = if (ancha) Espacios.e6 else Espacios.e4, bottom = Espacios.e3).sombra2(Radios.pildora, colores)) {
                Boton("Guardar capítulo", vm::guardarCapituloNuevo, icono = Iconos.save, habilitado = vm.estado != EstadoDelGuardado.GUARDANDO)
            }
        }
    }
}

/** `.m-chapter__fields`: el título a lo ancho y las tres cifras debajo; desde 600 dp, todo en una fila. Raya debajo. */
@Composable
private fun CamposDelCapitulo(vm: CapituloViewModel, capitulo: CapituloEditable, ancha: Boolean) {
    val colores = LocalColores.current
    var tocados by remember { mutableStateOf(emptySet<String>()) }
    val tocar = { campo: String -> tocados = tocados + campo }
    val nombre: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDeNombre(capitulo.nombre)
        CampoNativo(
            "Título del capítulo", capitulo.nombre, { valor -> vm.cambiar { it.copy(nombre = valor.take(200)) } }, m,
            seleccionarSiEs = "Capítulo ${capitulo.orden}",
            nota = if (error != null && "nombre" in tocados) error else "${capitulo.nombre.length} / 200".takeIf { capitulo.nombre.length >= 180 },
            notaEsError = error != null && "nombre" in tocados,
            alSalir = { tocar("nombre") },
        )
    }
    val pagina: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDePagina(capitulo.pagina)
        CampoNativo("Página inicial", capitulo.pagina, { valor -> vm.cambiar { it.copy(pagina = valor.filter(Char::isDigit)) } }, m, numerico = true,
            nota = error?.takeIf { "pagina" in tocados }, notaEsError = true,
            alSalir = {
                tocar("pagina")
                // `syncEndPageFromStart`: si la final queda vacía o por debajo, pasa a ser la inicial.
                vm.cambiar { c -> if (ReglasDelCapitulo.errorDePagina(c.pagina) == null && (c.paginaFinal.isEmpty() || (c.paginaFinal.toIntOrNull() ?: 0) < c.pagina.toInt())) c.copy(paginaFinal = c.pagina) else c }
            })
    }
    val paginaFinal: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDePaginaFinal(capitulo.paginaFinal)
        CampoNativo("Página final", capitulo.paginaFinal, { valor -> vm.cambiar { it.copy(paginaFinal = valor.filter(Char::isDigit)) } }, m, numerico = true,
            nota = error?.takeIf { "paginaFinal" in tocados }, notaEsError = true,
            alSalir = {
                tocar("paginaFinal")
                // `syncStartPageFromEnd`: si la inicial queda vacía o por encima, pasa a ser la final.
                vm.cambiar { c -> if (c.paginaFinal.isNotEmpty() && ReglasDelCapitulo.errorDePaginaFinal(c.paginaFinal) == null && (c.pagina.isEmpty() || (c.pagina.toIntOrNull() ?: 0) > c.paginaFinal.toInt())) c.copy(pagina = c.paginaFinal) else c }
            })
    }
    val orden: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDeOrden(capitulo.orden)
        CampoNativo("Orden", capitulo.orden, { valor -> vm.cambiar { it.copy(orden = valor.filter(Char::isDigit)) } }, m, numerico = true,
            nota = error?.takeIf { "orden" in tocados }, notaEsError = true, alSalir = { tocar("orden") })
    }
    // Compacto (opción A del propietario, 26/10/2026): un capítulo ya guardado y sin errores se resume en una línea, y
    // el lápiz la despliega.
    val conErrores = listOf(
        ReglasDelCapitulo.errorDeNombre(capitulo.nombre), ReglasDelCapitulo.errorDePagina(capitulo.pagina),
        ReglasDelCapitulo.errorDePaginaFinal(capitulo.paginaFinal), ReglasDelCapitulo.errorDeOrden(capitulo.orden),
    ).any { it != null }
    var desplegado by rememberSaveable(capitulo.id) { mutableStateOf(false) }
    if (!capitulo.esNuevo && !conErrores && !desplegado) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp)
                .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
                .clickable(role = Role.Button, onClickLabel = "Editar los datos del capítulo") { desplegado = true }
                .padding(bottom = Espacios.e2),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(ReglasDelCapitulo.resumen(capitulo), style = Textos.cuerpo.copy(fontWeight = FontWeight.SemiBold, color = colores.tinta), maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Icon(painterResource(Iconos.edit), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
        }
        return
    }
    Column(
        Modifier.fillMaxWidth()
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .padding(bottom = Espacios.e4),
        verticalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        if (ancha) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                nombre(Modifier.weight(2f))
                pagina(Modifier.weight(0.65f))
                paginaFinal(Modifier.weight(0.65f))
                orden(Modifier.weight(0.65f))
            }
        } else {
            nombre(Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                pagina(Modifier.weight(1f))
                paginaFinal(Modifier.weight(1f))
                orden(Modifier.weight(1f))
            }
        }
    }
}

/** `.m-chapter__scenes`: «Escenas» con «Nueva escena» y cada escena. */
@Composable
private fun Escenas(libroVm: LibroViewModel, vm: CapituloViewModel, libro: Libro, capitulo: CapituloEditable, enlaces: List<EnlaceNarrativo>, ancha: Boolean) {
    val colores = LocalColores.current
    Column {
        Row(Modifier.fillMaxWidth().padding(bottom = Espacios.e2), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Escenas", style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.0), lineHeight = 1.1.em, color = colores.tinta))
            BotonPequeno("Nueva escena", Iconos.add) { vm.anadirEscena() }
        }
        capitulo.escenas.forEachIndexed { i, escena ->
            TarjetaDeEscena(libroVm, vm, libro, capitulo, escena, i + 1, enlaces, ancha, ultima = i == capitulo.escenas.lastIndex)
        }
    }
}

/** El botón tonal pequeño de la cabecera de escenas: 36 dp, `4px 8px`, texto de `.72rem` e icono de 16 dp. */
@Composable
private fun BotonPequeno(texto: String, @DrawableRes icono: Int, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.heightIn(min = 36.dp).clip(Radios.pildora).background(colores.contenedorPrimario)
            .clickable(role = Role.Button, onClick = alPulsar).padding(horizontal = Espacios.e2, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.sobreContenedorPrimario, modifier = Modifier.size(16.dp))
        Text(texto, style = Textos.boton.copy(fontSize = rem(0.72), color = colores.sobreContenedorPrimario))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TarjetaDeEscena(
    libroVm: LibroViewModel, vm: CapituloViewModel, libro: Libro, capitulo: CapituloEditable, escena: EscenaEditable,
    numero: Int, enlaces: List<EnlaceNarrativo>, ancha: Boolean, ultima: Boolean,
) {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth()
            .drawBehind { if (!ultima) drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .padding(top = Espacios.e3, bottom = Espacios.e4),
        verticalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        // Compacta (opción A del propietario, 26/10/2026): el título una sola vez, en línea con la localización y borrar.
        val titulo: @Composable (Modifier) -> Unit = { m ->
            CampoNativo(
                null, escena.nombre, { valor -> vm.cambiarEscena(escena.clave) { it.copy(nombre = valor) } }, m,
                seleccionarSiEs = "Escena $numero", ejemplo = "Título de la escena", nombreAccesible = "Título de la escena $numero",
                nota = ReglasDelCapitulo.errorDeNombreDeEscena(escena)?.takeIf { escena.tocada }, notaEsError = true,
            )
        }
        val lugar: @Composable (Modifier) -> Unit = { m -> CampoDeLocalizacion(vm, libro, escena, m) }
        val borrar: @Composable () -> Unit = { BotonDeIcono(Iconos.delete, "Eliminar escena $numero", { vm.quitarEscena(escena.clave) }, color = colores.error) }
        if (ancha) Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.Top) { titulo(Modifier.weight(1f)); lugar(Modifier.weight(1f)); borrar() }
        else Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.Top) { titulo(Modifier.weight(1f)); borrar() }
            lugar(Modifier.fillMaxWidth())
        }
        Column {
            EditorRtf(
                valor = escena.descripcion,
                alCambiar = { nuevo -> vm.cambiarEscena(escena.clave) { it.copy(descripcion = nuevo) } },
                modifier = Modifier.fillMaxWidth(),
                enlaces = enlaces,
                alAbrirEnlace = { enlace -> libroVm.ir(VistaDelLibro.DeElemento(elementoDe(enlace.tipo), seleccionado = enlace.id)) },
                descripcion = "Descripción de la escena $numero",
                seleccionarTodoAlEnfocar = ReglasDelCapitulo.esDescripcionPorDefecto(escena.descripcion),
                alTerminarDeEditar = vm::guardarAhora,
                barraSoloAlEscribir = true,
            )
            if (!ReglasDelCapitulo.descripcionValida(escena)) {
                Text("La descripción es requerida (mínimo 15 caracteres).", style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.error), modifier = Modifier.padding(top = Espacios.e2))
            }
        }
        Personajes(vm, libro, capitulo, escena)
    }
}

/** «Localización»: busca entre las del libro (sin tildes) y solo vale una de la lista. */
@Composable
private fun CampoDeLocalizacion(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable, modifier: Modifier) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    val elegida = libro.localizaciones.firstOrNull { it.id == escena.idLocalizacion }?.nombre.orEmpty()
    val texto = escena.textoDeLocalizacion ?: elegida
    val consulta = escena.textoDeLocalizacion?.let { plegar(it).trim() }.orEmpty()
    val opciones = libro.localizaciones.filter { consulta.isEmpty() || plegar(it.nombre).trim().contains(consulta) }
    val neutra = ReglasDelCapitulo.localizacionNeutra(libro) != null
    Box(modifier) {
        CampoNativo(
            null, texto, { valor -> abierto = true; vm.escribirLocalizacion(escena.clave, valor) }, Modifier.fillMaxWidth(),
            iconoFinal = Iconos.unfoldMore, ejemplo = "Localización", nombreAccesible = "Localización",
            alEnfocar = { abierto = true },
            nota = when {
                !neutra -> "El libro no incluye «Sin localización»."
                !ReglasDelCapitulo.localizacionValida(escena) && escena.tocada -> "Selecciona una localización de la lista."
                else -> null
            },
            notaEsError = true,
        )
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, properties = PopupProperties(focusable = false), containerColor = colores.superficie, modifier = Modifier.widthIn(max = 300.dp)) {
            if (opciones.isEmpty()) DropdownMenuItem(text = { Text("No hay localizaciones disponibles", style = Textos.cuerpo.copy(color = colores.tintaSuave)) }, onClick = {}, enabled = false)
            opciones.forEach { lugar ->
                DropdownMenuItem(text = { Text(lugar.nombre, style = Textos.cuerpo.copy(color = colores.tinta)) }, onClick = { abierto = false; vm.elegirLocalizacion(escena.clave, lugar.id) })
            }
        }
    }
}

/**
 * Los personajes de la escena en una sola fila (opción A del propietario, 26/10/2026): primero los que están en escena y
 * después los solo nombrados (en cursiva y con «·»), cada uno con mover y quitar; y «+ Personaje», con su buscador:
 * tocar el nombre lo pone en escena y la @, como solo nombrado.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Personajes(vm: CapituloViewModel, libro: Libro, capitulo: CapituloEditable, escena: EscenaEditable) {
    val colores = LocalColores.current
    var buscado by remember { mutableStateOf("") }
    var abierto by remember { mutableStateOf(false) }
    val asignados = escena.personajes.map { it.id }.toSet()
    val disponibles = libro.personajes.filter { it.id !in asignados }.sortedWith { a, b -> porNombre.compare(a.nombre, b.nombre) }
    val filtrados = disponibles.filter { buscado.isBlank() || plegar(it.nombre).trim().contains(plegar(buscado).trim()) }
    val fichas = escena.personajes.sortedWith(
        compareBy<PersonajeEnEscena> { it.nombrado }.thenComparator { a, b -> porNombre.compare(ReglasDelCapitulo.nombreDePersonaje(libro, a.id), ReglasDelCapitulo.nombreDePersonaje(libro, b.id)) },
    )
    val cerrar = {
        abierto = false
        buscado = ""
    }
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (!capitulo.esNuevo && escena.personajes.isEmpty()) {
            Text("Necesita al menos un personaje presente o nombrado.", style = Textos.cuerpo.copy(fontSize = rem(0.7), color = colores.error))
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), itemVerticalAlignment = Alignment.CenterVertically) {
            fichas.forEach { personaje -> FichaDePersonaje(vm, libro, escena, personaje) }
            Box {
                val tinta = if (disponibles.isEmpty()) colores.tintaSuave else colores.primario
                Row(
                    Modifier.heightIn(min = 44.dp).clip(Radios.pildora)
                        .clickable(enabled = disponibles.isNotEmpty(), role = Role.Button, onClickLabel = "Añadir personaje") { abierto = true }
                        .padding(horizontal = Espacios.e2),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(painterResource(Iconos.personAdd), contentDescription = null, tint = tinta, modifier = Modifier.size(20.dp))
                    Text("Personaje", style = Textos.boton.copy(fontSize = rem(0.75), color = tinta))
                }
                DropdownMenu(abierto, onDismissRequest = cerrar, containerColor = colores.superficie, modifier = Modifier.widthIn(min = 260.dp, max = 320.dp)) {
                    CampoNativo(
                        etiqueta = null, valor = buscado, alCambiar = { buscado = it }, modifier = Modifier.padding(horizontal = Espacios.e2).fillMaxWidth(),
                        ejemplo = "Buscar personaje", iconoFinal = Iconos.search, nombreAccesible = "Buscar personaje",
                    )
                    Text(
                        "Toca el nombre si está en escena, o la @ si solo se le nombra.",
                        style = Textos.cuerpo.copy(fontSize = rem(0.68), color = colores.tintaSuave),
                        modifier = Modifier.padding(horizontal = Espacios.e3, vertical = 4.dp),
                    )
                    if (filtrados.isEmpty()) DropdownMenuItem(text = { Text("No quedan personajes disponibles", style = Textos.cuerpo.copy(color = colores.tintaSuave)) }, onClick = {}, enabled = false)
                    filtrados.forEach { personaje ->
                        DropdownMenuItem(
                            text = { Text(personaje.nombre, style = Textos.cuerpo.copy(color = colores.tinta)) },
                            onClick = {
                                cerrar()
                                vm.asignarPersonaje(escena.clave, personaje.id, false)
                            },
                            trailingIcon = {
                                BotonDeIcono(Iconos.alternateEmail, "Añadir a ${personaje.nombre} como solo nombrado", {
                                    cerrar()
                                    vm.asignarPersonaje(escena.clave, personaje.id, true)
                                })
                            },
                        )
                    }
                }
            }
        }
    }
}

/** Una ficha de personaje: el nombre (500, 11 dp), mover al otro grupo y quitar, sobre una píldora de 26 dp. */
@Composable
private fun FichaDePersonaje(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable, personaje: PersonajeEnEscena) {
    val colores = LocalColores.current
    val nombre = ReglasDelCapitulo.nombreDePersonaje(libro, personaje.id)
    Row(
        Modifier.heightIn(min = 44.dp)
            .drawBehind {
                val alto = size.height - 18.dp.toPx()
                drawRoundRect(colores.superficie, Offset(0f, 9.dp.toPx()), Size(size.width, alto), androidx.compose.ui.geometry.CornerRadius(alto / 2))
                drawRoundRect(colores.contorno, Offset(0f, 9.dp.toPx()), Size(size.width, alto), androidx.compose.ui.geometry.CornerRadius(alto / 2), style = androidx.compose.ui.graphics.drawscope.Stroke(1.dp.toPx()))
            }
            .padding(start = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            if (personaje.nombrado) "· $nombre" else nombre,
            style = Textos.cuerpo.copy(
                fontSize = 11.sp, fontWeight = FontWeight.Medium, lineHeight = 1.2.em,
                color = if (personaje.nombrado) colores.tintaSuave else colores.tinta,
                fontStyle = if (personaje.nombrado) FontStyle.Italic else FontStyle.Normal,
            ),
            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false).padding(end = 4.dp),
        )
        BotonDeFicha(
            if (personaje.nombrado) Iconos.person else Iconos.alternateEmail,
            if (personaje.nombrado) "Mover a personajes presentes" else "Mover a solo nombrados",
        ) { vm.asignarPersonaje(escena.clave, personaje.id, !personaje.nombrado) }
        BotonDeFicha(Iconos.close, if (personaje.nombrado) "Quitar personaje nombrado" else "Quitar personaje", ultimo = true) { vm.quitarPersonaje(escena.clave, personaje.id) }
    }
}

@Composable
private fun BotonDeFicha(@DrawableRes icono: Int, descripcion: String, ultimo: Boolean = false, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(
        Modifier.size(44.dp).clickable(role = Role.Button, onClick = alPulsar).semantics { contentDescription = descripcion }.padding(end = if (ultimo) 8.dp else 0.dp),
        contentAlignment = Alignment.CenterEnd,
    ) { Icon(painterResource(icono), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(12.dp)) }
}

/**
 * `.m-native-field`: la etiqueta (`.72rem`, 800, tinta suave), el campo de 44 dp (borde del contorno fuerte, radio
 * pequeño, superficie; con el foco, borde del primario y halo) y la nota de debajo (`.68rem`, 600; en rojo si es error).
 * Al enfocarlo, si su texto es [seleccionarSiEs] (el de por defecto), se selecciona entero (`selectDefaultText`).
 */
@Composable
private fun CampoNativo(
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
