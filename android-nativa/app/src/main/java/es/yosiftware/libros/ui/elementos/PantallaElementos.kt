package es.yosiftware.libros.ui.elementos

import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.editor.EditorRtf
import es.yosiftware.libros.ui.libro.Elemento
import es.yosiftware.libros.ui.libro.LibroViewModel
import es.yosiftware.libros.ui.libro.VistaDelLibro
import es.yosiftware.libros.ui.libro.enlacesDe
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra1
import es.yosiftware.libros.ui.tema.sombra2

/** El icono de cada tipo (`entityToolbarActions`). */
fun iconoDe(elemento: Elemento): Int = when (elemento) {
    Elemento.PERSONAJES -> Iconos.coPresent
    Elemento.ORGANIZACIONES -> Iconos.groups
    Elemento.EVENTOS -> Iconos.event
    Elemento.LOCALIZACIONES -> Iconos.myLocation
    Elemento.CONCEPTOS -> Iconos.autoAwesome
    Elemento.CITAS -> Iconos.formatQuote
}

private fun iconoDePersonaje(nombre: String): Int = when (nombre) {
    "star" -> Iconos.star
    "sync_alt" -> Iconos.syncAlt
    "wrong_location" -> Iconos.wrongLocation
    "history" -> Iconos.history
    else -> Iconos.personOutline
}

/**
 * Los elementos de un tipo (mobile-narrative-entity-view en 5dc3120): la cabecera fija, la lista («Por libro» o
 * «Mezclados») y el formulario del alta o la ficha. Guarda en el acto al pasar a segundo plano o salir de la vista.
 */
@Composable
fun PantallaElementos(libroVm: LibroViewModel, vista: VistaDelLibro.DeElemento, vm: ElementosViewModel) {
    val colores = LocalColores.current
    val libro = libroVm.libro ?: return
    LaunchedEffect(libro, vista) { vm.abrir(libro, vista) }
    vm.alGuardar = libroVm::recibirLibro
    val ciclo = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(vm, ciclo) {
        val observador = LifecycleEventObserver { _, evento -> if (evento == Lifecycle.Event.ON_STOP) vm.guardarAhora() }
        ciclo.addObserver(observador)
        onDispose {
            ciclo.removeObserver(observador)
            vm.guardarAhora()
        }
    }
    val enFormulario = vm.modo != ModoDeElementos.Lista
    // Atrás en el formulario vuelve a la lista (como la flecha); en la lista, lo atiende el libro.
    BackHandler(enabled = enFormulario) { vm.volver() }
    val tipo = vista.elemento
    Column(Modifier.fillMaxSize().background(colores.lienzo)) {
        Cabecera(vm, libro, tipo)
        Box(Modifier.weight(1f).fillMaxWidth()) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Column(Modifier.widthIn(max = 1040.dp).fillMaxWidth().align(Alignment.CenterHorizontally).padding(bottom = Espacios.e8)) {
                    if (enFormulario) vm.ficha?.let { Formulario(libroVm, vm, libro, it) }
                    else Lista(vm, libro, tipo)
                }
            }
            if (enFormulario) {
                Box(Modifier.align(Alignment.BottomEnd).padding(Espacios.e4).sombra2(Radios.pildora, colores)) {
                    Boton(
                        if (vm.modo is ModoDeElementos.Ficha) "Guardar cambios" else "Crear ${tipo.singular}",
                        vm::guardar, icono = Iconos.save, habilitado = !vm.guardando,
                    )
                }
            }
        }
    }
    vm.nombreRepetido?.let { nombre ->
        AlertDialog(
            onDismissRequest = { vm.confirmarNombreRepetido(false) },
            text = { Text("Ya hay un personaje llamado «$nombre» en este libro. ¿Quieres crear otro con el mismo nombre?", style = Textos.cuerpo.copy(color = colores.tinta)) },
            confirmButton = { TextButton(onClick = { vm.confirmarNombreRepetido(true) }) { Text("Crear otro") } },
            dismissButton = { TextButton(onClick = { vm.confirmarNombreRepetido(false) }) { Text("Cancelar") } },
            containerColor = colores.superficie,
        )
    }
}

/**
 * `.m-entity__header`: 64 dp, raya debajo, sobre el lienzo. En el formulario, la flecha, «Modificar» o «Crear» y el
 * botón de guardar relleno; en la lista, el título y «Crear …».
 */
@Composable
private fun Cabecera(vm: ElementosViewModel, libro: Libro, tipo: Elemento) {
    val colores = LocalColores.current
    val enFormulario = vm.modo != ModoDeElementos.Lista
    val titulo = when (vm.modo) {
        is ModoDeElementos.Ficha -> "Modificar ${tipo.singular}"
        ModoDeElementos.Alta -> "Crear ${tipo.singular}"
        ModoDeElementos.Lista -> tipo.etiqueta
    }
    val ancho = LocalVentana.current.anchoDp
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).background(mezclar(colores.lienzo, 0.94f))
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .padding(horizontal = Espacios.e4, vertical = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (enFormulario) BotonDeIcono(Iconos.arrowBack, "Volver al listado", { vm.volver() })
        Column(Modifier.weight(1f)) {
            Text(libro.nombre.uppercase(), style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.ExtraBold, letterSpacing = 0.08.em, color = colores.primario), maxLines = 1, overflow = TextOverflow.Ellipsis)
            // `clamp(1.15rem, 4vw, 1.55rem)`.
            val tamano = (ancho * 0.04f / 16f).coerceIn(1.15f, 1.55f)
            Text(titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(tamano.toDouble()), lineHeight = 1.2.em, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
        }
        if (enFormulario) {
            Box(
                Modifier.size(48.dp).clip(CircleShape).background(colores.primario)
                    .clickable(enabled = !vm.guardando, role = Role.Button, onClick = vm::guardar)
                    .semantics { contentDescription = (if (vm.modo is ModoDeElementos.Ficha) "Actualizar " else "Crear ") + tipo.singular },
                contentAlignment = Alignment.Center,
            ) { Icon(painterResource(Iconos.save), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(24.dp)) }
        } else {
            Row(
                Modifier.heightIn(min = 44.dp).clip(Radios.pildora).background(colores.primario)
                    .clickable(role = Role.Button) { vm.abrirAlta() }.padding(horizontal = Espacios.e3),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(Iconos.add), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(20.dp))
                Text("Crear ${tipo.singular}", style = Textos.cuerpo.copy(fontSize = rem(0.74), fontWeight = FontWeight.ExtraBold, color = colores.sobrePrimario), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

// --- La lista. ---

@Composable
private fun Lista(vm: ElementosViewModel, libro: Libro, tipo: Elemento) {
    val colores = LocalColores.current
    val compacta = LocalVentana.current.anchoDp < 600
    val elementos = remember(libro, tipo) { ListaDeElementos.elementos(libro, tipo) }
    Column(Modifier.padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
        // `.m-entity-list__toolbar`: la cuenta y, si hay libros previos, «Mezclados» y «Por libro».
        val segmentado: @Composable (Modifier) -> Unit = { m -> Segmentado(vm, m) }
        if (compacta) {
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                Text(ListaDeElementos.total(elementos.size, tipo), style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.Bold, color = colores.tintaSuave))
                if (ListaDeElementos.hayLibrosPrevios(elementos)) segmentado(Modifier.fillMaxWidth())
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(ListaDeElementos.total(elementos.size, tipo), style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.Bold, color = colores.tintaSuave), modifier = Modifier.weight(1f))
                if (ListaDeElementos.hayLibrosPrevios(elementos)) segmentado(Modifier)
            }
        }
        when {
            elementos.isEmpty() -> Vacio(tipo)
            vm.porLibro -> ListaDeElementos.gruposPorLibro(libro, elementos, tipo).forEach { grupo -> GrupoDeFilas(grupo.etiqueta, grupo.elementos, vm, libro, tipo) }
            else -> GrupoDeFilas(null, ListaDeElementos.mezclados(elementos, tipo), vm, libro, tipo)
        }
    }
}

@Composable
private fun Segmentado(vm: ElementosViewModel, modifier: Modifier) {
    val colores = LocalColores.current
    Row(modifier.heightIn(min = 44.dp).clip(Radios.pildora).background(colores.superficieContenedor).padding(3.dp).semantics { contentDescription = "Orden del listado" }) {
        listOf(false to "Mezclados", true to "Por libro").forEach { (porLibro, texto) ->
            val activo = vm.porLibro == porLibro
            Box(
                Modifier.weight(1f, fill = modifier != Modifier).heightIn(min = 38.dp)
                    .then(if (activo) Modifier.sombra1(Radios.pildora, colores) else Modifier)
                    .clip(Radios.pildora).background(if (activo) colores.superficie else androidx.compose.ui.graphics.Color.Transparent)
                    .clickable(role = Role.Button) { vm.porLibro = porLibro }.padding(horizontal = Espacios.e3)
                    .semantics { selected = activo },
                contentAlignment = Alignment.Center,
            ) { Text(texto, style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.ExtraBold, color = if (activo) colores.primario else colores.tintaSuave)) }
        }
    }
}

@Composable
private fun GrupoDeFilas(etiqueta: String?, elementos: List<ElementoDeLista>, vm: ElementosViewModel, libro: Libro, tipo: Elemento) {
    val colores = LocalColores.current
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (etiqueta != null) Text(etiqueta.uppercase(), style = Textos.cuerpo.copy(fontSize = rem(0.75), letterSpacing = 0.07.em, color = colores.tintaSuave), modifier = Modifier.padding(top = Espacios.e3, bottom = 4.dp))
        elementos.forEach { elemento -> Fila(elemento, vm, libro, tipo) }
    }
}

/** `.m-entity-row`: 64 dp, el icono, el nombre y su detalle, y la flecha; raya debajo, sobre la superficie. */
@Composable
private fun Fila(elemento: ElementoDeLista, vm: ElementosViewModel, libro: Libro, tipo: Elemento) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).background(colores.superficie)
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .clickable { vm.abrirFicha(elemento.id) }.padding(horizontal = Espacios.e3, vertical = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(32.dp), contentAlignment = Alignment.Center) {
            when (val icono = ListaDeElementos.icono(elemento, tipo)) {
                IconoDeFila.DelTipo -> Icon(painterResource(iconoDe(tipo)), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
                is IconoDeFila.DePersonaje -> Icon(painterResource(iconoDePersonaje(icono.nombre)), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
                is IconoDeFila.Simbolo -> Text(icono.texto, style = Textos.cuerpo.copy(fontSize = rem(1.25), color = colores.primario, textAlign = TextAlign.Center))
                IconoDeFila.Ninguno -> Unit
            }
        }
        Column(Modifier.weight(1f)) {
            Text(elemento.nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(ListaDeElementos.meta(libro, elemento), style = Textos.cuerpo.copy(fontSize = rem(0.82), color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 3.dp))
        }
        Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(24.dp))
    }
}

/** `.m-empty`: el icono del tipo, «Aún no hay …» y la invitación a crearlo. */
@Composable
private fun Vacio(tipo: Elemento) {
    val colores = LocalColores.current
    Column(Modifier.fillMaxWidth().heightIn(min = 280.dp).padding(Espacios.e6), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterVertically)) {
        Icon(painterResource(iconoDe(tipo)), contentDescription = null, tint = colores.primario, modifier = Modifier.size(56.dp))
        Text("Aún no hay ${tipo.etiqueta.lowercase()}", style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.5), color = colores.tinta, textAlign = TextAlign.Center))
        Text("Créalo desde el botón superior cuando aparezca en la historia.", style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center))
    }
}

// --- El formulario. ---

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Formulario(libroVm: LibroViewModel, vm: ElementosViewModel, libro: Libro, ficha: FichaEditable) {
    val colores = LocalColores.current
    val tipo = ficha.tipo
    val ancha = LocalVentana.current.anchoDp >= 600
    val enlaces = remember(libro, ficha.id) { enlacesDe(libro).filterNot { ficha.id != null && it.id == ficha.id && elementoDe(it.tipo) == tipo } }
    Column {
        Seccion(null, null) {
            val nombreError = vm.errorDeNombre ?: if (ficha.tocada && !ReglasDeLaFicha.nombreValido(ficha.nombre)) ReglasDeLaFicha.ERROR_DE_NOMBRE else null
            CampoConContorno(if (tipo == Elemento.CITAS) "Título" else "Nombre de ${tipo.singular}", ficha.nombre, { v -> vm.cambiar { it.copy(nombre = v) } }, Modifier.fillMaxWidth(), error = nombreError, maximo = 100)
            if (ficha.nombreCambiado) {
                SelectorConContorno(
                    "Tipo de cambio",
                    listOf(CambioDeNombre.NARRATIVO to "Nuevo nombre; conservar el anterior como apodo", CambioDeNombre.ERRATA to "Corrección de errata"),
                    ficha.cambioDeNombre, { v -> vm.cambiar { it.copy(cambioDeNombre = v) } }, Modifier.fillMaxWidth(),
                )
            }
            when (tipo) {
                Elemento.PERSONAJES -> Pareja(ancha,
                    { m -> SelectorConContorno("Estado", vm.estadosDePersonaje, ficha.estadoDePersonaje, { v -> vm.cambiar { it.copy(estadoDePersonaje = v) } }, m) },
                    { m -> SelectorConContorno("Sexo / género", listOf(0 to "Chico", 1 to "Chica", 2 to "No sé"), ficha.sexo, { v -> vm.cambiar { it.copy(sexo = v) } }, m) })
                Elemento.LOCALIZACIONES -> SelectorConContorno("Estado", vm.estadosDeLugar, ficha.estadoDeLugar, { v -> vm.cambiar { it.copy(estadoDeLugar = v) } }, Modifier.fillMaxWidth())
                Elemento.EVENTOS -> {
                    val elegida = libro.localizaciones.firstOrNull { it.id == ficha.idLocalizacion }?.nombre.orEmpty()
                    val consulta = ficha.textoDeLocalizacion?.let { plegar(it).trim() }.orEmpty()
                    AutocompletadoConContorno(
                        "Localización", ficha.textoDeLocalizacion ?: elegida,
                        libro.localizaciones.filter { consulta.isEmpty() || plegar(it.nombre).contains(consulta) }.map { it.id to it.nombre },
                        "No hay localizaciones disponibles",
                        alEscribir = { v -> vm.cambiar { it.copy(textoDeLocalizacion = v, idLocalizacion = null) } },
                        alElegir = { id -> vm.cambiar { it.copy(idLocalizacion = id, textoDeLocalizacion = null) } },
                        modifier = Modifier.fillMaxWidth(),
                        ayuda = if (libro.localizaciones.isEmpty()) "Falta la localización base del libro." else null,
                    )
                }
                Elemento.CITAS -> Pareja(ancha,
                    { m -> CampoConContorno("Página", ficha.pagina, { v -> vm.cambiar { it.copy(pagina = v.filter(Char::isDigit)) } }, m, numerico = true) },
                    { m ->
                        val elegido = libro.personajes.firstOrNull { it.id == ficha.idPersonaje }?.nombre.orEmpty()
                        val consulta = ficha.textoDePersonaje?.let { plegar(it).trim() }.orEmpty()
                        AutocompletadoConContorno(
                            "Personaje", ficha.textoDePersonaje ?: elegido,
                            ListaDeElementos.porOrigen(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES)
                                .filter { consulta.isEmpty() || plegar(it.nombre).contains(consulta) }.map { it.id to it.nombre },
                            "No hay personajes disponibles",
                            alEscribir = { v -> vm.cambiar { it.copy(textoDePersonaje = v, idPersonaje = null) } },
                            alElegir = { id -> vm.cambiar { it.copy(idPersonaje = id, textoDePersonaje = null) } },
                            modifier = m,
                        )
                    })
                else -> Unit
            }
        }
        Seccion(Iconos.notes, "Entradas narrativas", accion = { BotonPequeno("Nueva entrada", Iconos.add) { vm.anadirEntrada() } }) {
            ficha.entradas.forEachIndexed { i, entrada ->
                Column(
                    Modifier.fillMaxWidth().drawBehind { if (i < ficha.entradas.lastIndex) drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
                        .padding(top = Espacios.e3, bottom = Espacios.e4),
                    verticalArrangement = Arrangement.spacedBy(Espacios.e3),
                ) {
                    Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        CampoConContorno("Título", entrada.titulo, { v -> vm.cambiarEntrada(entrada.clave) { it.copy(titulo = v) } }, Modifier.weight(1f), maximo = 100)
                        if (ficha.entradas.size > 1) BotonDeIcono(Iconos.delete, "Eliminar entrada", { vm.quitarEntrada(entrada.clave) }, color = colores.error)
                    }
                    EditorRtf(
                        valor = entrada.descripcion,
                        alCambiar = { nuevo -> vm.cambiarEntrada(entrada.clave) { it.copy(descripcion = nuevo) } },
                        modifier = Modifier.fillMaxWidth(),
                        enlaces = enlaces,
                        alAbrirEnlace = { enlace -> libroVm.ir(VistaDelLibro.DeElemento(elementoDe(enlace.tipo), seleccionado = enlace.id)) },
                        descripcion = "Descripción de la entrada ${i + 1}",
                        seleccionarTodoAlEnfocar = ReglasDeLaFicha.esDescripcionPorDefecto(tipo, entrada.descripcion),
                    )
                    if (!ReglasDeLaFicha.descripcionValida(entrada.descripcion)) Text(ReglasDeLaFicha.ERROR_DE_DESCRIPCION, style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.error))
                }
            }
        }
        when (tipo) {
            Elemento.PERSONAJES -> {
                Apodos(vm, ficha)
                RelacionesDePersonaje(vm, libro, ficha)
            }
            Elemento.ORGANIZACIONES -> VinculosDeOrganizacion(vm, libro, ficha, ancha)
            Elemento.EVENTOS -> Participantes(vm, libro, ficha)
            else -> Unit
        }
        Box(Modifier.heightIn(min = 72.dp))
    }
}

private fun elementoDe(tipo: es.yosiftware.libros.datos.rtf.TipoDeEnlace): Elemento = when (tipo) {
    es.yosiftware.libros.datos.rtf.TipoDeEnlace.PERSONAJE -> Elemento.PERSONAJES
    es.yosiftware.libros.datos.rtf.TipoDeEnlace.LOCALIZACION -> Elemento.LOCALIZACIONES
    es.yosiftware.libros.datos.rtf.TipoDeEnlace.ORGANIZACION -> Elemento.ORGANIZACIONES
    es.yosiftware.libros.datos.rtf.TipoDeEnlace.CONCEPTO -> Elemento.CONCEPTOS
    es.yosiftware.libros.datos.rtf.TipoDeEnlace.EVENTO -> Elemento.EVENTOS
    es.yosiftware.libros.datos.rtf.TipoDeEnlace.CITA -> Elemento.CITAS
}

/** Dos campos en una fila desde 600 dp; uno debajo de otro en el móvil (`.m-form-grid`). */
@Composable
private fun Pareja(ancha: Boolean, primero: @Composable (Modifier) -> Unit, segundo: @Composable (Modifier) -> Unit) {
    if (ancha) Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) { primero(Modifier.weight(1f)); segundo(Modifier.weight(1f)) }
    else Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) { primero(Modifier.fillMaxWidth()); segundo(Modifier.fillMaxWidth()) }
}

/**
 * `.m-form-section`: 20 dp arriba y abajo, raya debajo; la cabecera (48 dp, icono del primario, título display de
 * 1.2rem, acción) con su raya.
 */
@Composable
private fun Seccion(@DrawableRes icono: Int?, titulo: String?, accion: (@Composable () -> Unit)? = null, contenido: @Composable () -> Unit) {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth()
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .padding(horizontal = Espacios.e4, vertical = Espacios.e5),
        verticalArrangement = Arrangement.spacedBy(Espacios.e4),
    ) {
        if (titulo != null) {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 48.dp)
                    .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
                    .padding(bottom = Espacios.e3),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
                Text(titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.2), color = colores.tinta), modifier = Modifier.weight(1f))
                accion?.invoke()
            }
        }
        contenido()
    }
}

@Composable
private fun BotonPequeno(texto: String, @DrawableRes icono: Int, alPulsar: () -> Unit) {
    Boton(texto, alPulsar, variante = VarianteDeBoton.Tonal, icono = icono)
}

// --- Personajes: apodos y relaciones. ---

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Apodos(vm: ElementosViewModel, ficha: FichaEditable) {
    val colores = LocalColores.current
    Seccion(Iconos.badge, "Apodos") {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            CampoLlano(ficha.apodoPendiente, "Nuevo apodo", { v -> vm.cambiar { it.copy(apodoPendiente = v) } }, Modifier.weight(1f), alIntro = { vm.cambiar(ReglasDeLaFicha::anadirApodo) })
            BotonDeIcono(Iconos.add, "Añadir apodo", { vm.cambiar(ReglasDeLaFicha::anadirApodo) }, habilitado = ReglasDeLaFicha.apodoValido(ficha.apodoPendiente))
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            if (ficha.apodos.isEmpty()) Text("Este personaje aún no tiene apodos.", style = Textos.cuerpo.copy(color = colores.tintaSuave))
            ficha.apodos.forEach { apodo ->
                Row(
                    Modifier.heightIn(min = 44.dp).clip(Radios.pildora).background(colores.superficieContenedor).border(1.dp, colores.contorno, Radios.pildora).padding(start = Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(apodo, style = Textos.cuerpo.copy(color = colores.tinta), modifier = Modifier.padding(end = if (ReglasDeLaFicha.esElNombre(ficha, apodo)) Espacios.e3 else 0.dp))
                    // El nombre actual no se quita aquí (la API lo rechaza): se cambia con el campo del nombre.
                    if (!ReglasDeLaFicha.esElNombre(ficha, apodo)) BotonDeIcono(Iconos.close, "Eliminar $apodo", { vm.cambiar { it.copy(apodos = it.apodos - apodo) } })
                }
            }
        }
    }
}

@Composable
private fun RelacionesDePersonaje(vm: ElementosViewModel, libro: Libro, ficha: FichaEditable) {
    val colores = LocalColores.current
    var buscado by remember { mutableStateOf("") }
    Seccion(Iconos.hub, "Relaciones") {
        Buscador(buscado, "Buscar personaje") { buscado = it }
        val personajes = ListaDeElementos.mezclados(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES)
            .filter { it.id != ficha.id && (buscado.isBlank() || plegar(it.nombre).contains(plegar(buscado).trim())) }
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            personajes.forEach { p ->
                val elegido = ficha.relaciones.any { it.idPersonaje == p.id }
                OpcionDeLista(if (elegido) Iconos.checkCircle else Iconos.personAdd, p.nombre, elegido) {
                    // Tocar de nuevo lo quita (en la web no alternaba).
                    vm.cambiar { f -> if (elegido) f.copy(relaciones = f.relaciones.filter { it.idPersonaje != p.id }) else f.copy(relaciones = f.relaciones + RelacionEditable(p.id)) }
                }
            }
        }
        ficha.relaciones.forEach { r ->
            val nombre = libro.personajes.firstOrNull { it.id == r.idPersonaje }?.nombre ?: "Personaje ${r.idPersonaje}"
            Column {
                Text(nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                    CampoLlano(r.parentesco, "Parentesco", { v -> vm.cambiar { f -> f.copy(relaciones = f.relaciones.map { if (it.idPersonaje == r.idPersonaje) it.copy(parentesco = v) else it }) } }, Modifier.weight(1f))
                    BotonDeIcono(Iconos.close, "Eliminar relación", { vm.cambiar { f -> f.copy(relaciones = f.relaciones.filter { it.idPersonaje != r.idPersonaje }) } })
                }
            }
        }
    }
}

// --- Organizaciones y eventos. ---

@Composable
private fun VinculosDeOrganizacion(vm: ElementosViewModel, libro: Libro, ficha: FichaEditable, ancha: Boolean) {
    val colores = LocalColores.current
    var buscado by remember { mutableStateOf("") }
    val coincide = { nombre: String -> buscado.isBlank() || plegar(nombre).contains(plegar(buscado).trim()) }
    Seccion(Iconos.hub, "Relaciones") {
        Buscador(buscado, "Buscar entidad") { buscado = it }
        val personajes: @Composable (Modifier) -> Unit = { m ->
            Column(m, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("PERSONAJES", style = Textos.cuerpo.copy(fontSize = rem(0.72), letterSpacing = 0.06.em, color = colores.tintaSuave))
                ListaDeElementos.mezclados(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES).filter { coincide(it.nombre) }.forEach { p ->
                    val elegido = ficha.vinculos.any { it.personaje && it.id == p.id }
                    OpcionDeLista(if (elegido) Iconos.checkCircle else Iconos.personAdd, p.nombre, elegido) { alternarVinculo(vm, true, p.id, elegido) }
                }
            }
        }
        val lugares: @Composable (Modifier) -> Unit = { m ->
            Column(m, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("LOCALIZACIONES", style = Textos.cuerpo.copy(fontSize = rem(0.72), letterSpacing = 0.06.em, color = colores.tintaSuave))
                libro.localizaciones.filter { plegar(it.nombre).trim() != "sin localizacion" && coincide(it.nombre) }.sortedBy { plegar(it.nombre) }.forEach { l ->
                    val elegido = ficha.vinculos.any { !it.personaje && it.id == l.id }
                    OpcionDeLista(if (elegido) Iconos.checkCircle else Iconos.addLocationAlt, l.nombre, elegido) { alternarVinculo(vm, false, l.id, elegido) }
                }
            }
        }
        Pareja(ancha, personajes, lugares)
        ficha.vinculos.forEach { v ->
            val nombre = if (v.personaje) libro.personajes.firstOrNull { it.id == v.id }?.nombre ?: "Personaje ${v.id}" else libro.localizaciones.firstOrNull { it.id == v.id }?.nombre ?: "Localización ${v.id}"
            Column {
                Text(nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                    CampoLlano(v.descripcion, "Descripción", { d -> vm.cambiar { f -> f.copy(vinculos = f.vinculos.map { if (it.personaje == v.personaje && it.id == v.id) it.copy(descripcion = d) else it }) } }, Modifier.weight(1f))
                    BotonDeIcono(Iconos.close, "Eliminar relación", { alternarVinculo(vm, v.personaje, v.id, true) })
                }
                if (ficha.tocada && !ReglasDeLaFicha.vinculoValido(v)) Text(ReglasDeLaFicha.ERROR_DE_VINCULO, style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.error))
            }
        }
    }
}

private fun alternarVinculo(vm: ElementosViewModel, personaje: Boolean, id: Int, quitar: Boolean) = vm.cambiar { f ->
    if (quitar) f.copy(vinculos = f.vinculos.filterNot { it.personaje == personaje && it.id == id })
    else f.copy(vinculos = f.vinculos + VinculoDeOrganizacion(personaje, id))
}

@Composable
private fun Participantes(vm: ElementosViewModel, libro: Libro, ficha: FichaEditable) {
    val colores = LocalColores.current
    var buscado by remember { mutableStateOf("") }
    Seccion(Iconos.group, "Personajes", accion = { Text(ficha.participantes.size.toString(), style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta)) }) {
        Buscador(buscado, "Buscar personaje") { buscado = it }
        val personajes = ListaDeElementos.porOrigen(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES)
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            ListaDeElementos.agruparPorGrupo(personajes, { it.grupo }, { it.ordenGrupo }, { it.nombre }, buscado).forEach { (grupo, miembros) ->
                Text(grupo.uppercase(), style = Textos.cuerpo.copy(fontSize = rem(0.72), letterSpacing = 0.06.em, color = colores.tintaSuave), modifier = Modifier.padding(top = Espacios.e2, bottom = 4.dp))
                miembros.forEach { p ->
                    val dentro = p.id in ficha.participantes
                    OpcionDeLista(if (dentro) Iconos.checkCircle else Iconos.radioButtonUnchecked, p.nombre, dentro) {
                        vm.cambiar { f -> f.copy(participantes = if (dentro) f.participantes - p.id else f.participantes + p.id) }
                    }
                }
            }
        }
    }
}

// --- Piezas. ---

/** `.m-pick-list button`: 44 dp, el icono y el nombre; elegido, con el borde y el contenedor del primario. */
@Composable
private fun OpcionDeLista(@DrawableRes icono: Int, texto: String, elegido: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(forma)
            .background(if (elegido) colores.contenedorPrimario else colores.superficieContenedor)
            .border(1.dp, if (elegido) colores.primario else androidx.compose.ui.graphics.Color.Transparent, forma)
            .clickable(role = Role.Checkbox, onClick = alPulsar).semantics { selected = elegido }
            .padding(horizontal = Espacios.e2, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(28.dp), contentAlignment = Alignment.Center) { Icon(painterResource(icono), contentDescription = null, tint = if (elegido) colores.primario else colores.tinta, modifier = Modifier.size(24.dp)) }
        Text(texto, style = Textos.cuerpo.copy(color = if (elegido) colores.primario else colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** `.m-search`: la píldora del buscador con la lupa. */
@Composable
private fun Buscador(valor: String, ejemplo: String, alCambiar: (String) -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(Radios.pildora).background(colores.superficie).border(1.dp, colores.contornoFuerte, Radios.pildora).padding(horizontal = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
        CampoLlano(valor, ejemplo, alCambiar, Modifier.weight(1f), conBorde = false)
    }
}

/** Un `input` llano (`.m-inline-add`, `.m-relation-draft`): 44 dp, borde del contorno fuerte y radio pequeño. */
@Composable
private fun CampoLlano(valor: String, ejemplo: String, alCambiar: (String) -> Unit, modifier: Modifier, conBorde: Boolean = true, alIntro: (() -> Unit)? = null) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    BasicTextField(
        value = valor,
        onValueChange = alCambiar,
        singleLine = true,
        textStyle = Textos.cuerpo.copy(color = colores.tinta),
        cursorBrush = SolidColor(colores.primario),
        keyboardOptions = KeyboardOptions(imeAction = if (alIntro != null) ImeAction.Done else ImeAction.Default),
        keyboardActions = KeyboardActions(onDone = { alIntro?.invoke() }),
        modifier = modifier.semantics { contentDescription = ejemplo },
        decorationBox = { interior ->
            Box(
                Modifier.fillMaxWidth().heightIn(min = 44.dp)
                    .then(if (conBorde) Modifier.background(colores.superficie, forma).border(1.dp, colores.contornoFuerte, forma) else Modifier)
                    .padding(horizontal = if (conBorde) Espacios.e2 else 0.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (valor.isEmpty()) Text(ejemplo, style = Textos.cuerpo.copy(color = colores.tintaSuave), maxLines = 1)
                interior()
            }
        },
    )
}
