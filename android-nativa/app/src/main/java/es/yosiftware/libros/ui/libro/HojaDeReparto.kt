package es.yosiftware.libros.ui.libro

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.Personaje
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.elementos.ElementosViewModel
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2

// Añadir personajes a una escena (rediseño del 6/11/2026, mezcla de las opciones A y C del propietario): la hoja de
// reparto (buscador, «En escena / Solo nombrado», los elegidos arriba, casillas para elegir varios y «Crear «…»» sin salir
// del capítulo), la @ del texto y las fichas de la escena.

/**
 * Crear un personaje desde el capítulo, con el alta de Elementos ([ElementosViewModel.crearDesdeLaEscena]) y su aviso
 * de nombre repetido: si ya hay uno con ese nombre, se pregunta antes ([Confirmacion]).
 */
class CreadorDePersonajes(private val personajes: ElementosViewModel) {
    private var repetido by mutableStateOf<Pair<String, (Int) -> Unit>?>(null)

    /** El nombre que se está creando, o `null`. */
    val creando: String? get() = personajes.creandoDesdeLaEscena

    fun crear(libro: Libro, nombre: String, alCrear: (Int) -> Unit) {
        if (creando != null) return
        if (RepartoDeEscena.esNombreRepetido(libro.personajes, nombre)) repetido = nombre to alCrear
        else personajes.crearDesdeLaEscena(nombre, alCrear)
    }

    /** «Ya hay un personaje llamado…»: el mismo aviso que la hoja de alta. */
    @Composable
    fun Confirmacion() {
        val (nombre, alCrear) = repetido ?: return
        val colores = LocalColores.current
        AlertDialog(
            onDismissRequest = { repetido = null },
            text = { Text("Ya hay un personaje llamado «$nombre» en este libro. ¿Quieres crear otro con el mismo nombre?", style = Textos.cuerpo.copy(color = colores.tinta)) },
            confirmButton = { TextButton(onClick = { repetido = null; personajes.crearDesdeLaEscena(nombre, alCrear) }) { Text("Crear otro") } },
            dismissButton = { TextButton(onClick = { repetido = null }) { Text("Cancelar") } },
            containerColor = colores.superficie,
        )
    }
}

/**
 * La hoja de reparto de [escena] (`null`: cerrada): el buscador, el conmutador de cómo entran, los elegidos como fichas
 * (tocar una la quita), la lista con casillas de los que aún no están en la escena, «Crear «…»» y «Añadir N».
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HojaDeReparto(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable?, creador: CreadorDePersonajes) {
    val colores = LocalColores.current
    var buscado by remember(escena?.clave) { mutableStateOf("") }
    var nombrado by remember(escena?.clave) { mutableStateOf(false) }
    var seleccion by remember(escena?.clave) { mutableStateOf(SeleccionDeReparto()) }
    HojaInferior(abierta = escena != null, alCerrar = vm::cerrarReparto, titulo = "Personajes") {
        if (escena == null) return@HojaInferior
        val enEscena = escena.personajes.map { it.id }.toSet()
        val lista = RepartoDeEscena.filtrar(libro.personajes, buscado, excluir = enEscena)
        val paraCrear = RepartoDeEscena.nombreParaCrear(buscado)
        Row(Modifier.fillMaxWidth().padding(start = Espacios.e5, end = Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
            Text("Personajes", style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = 21.sp, fontWeight = FontWeight.Bold, color = colores.tinta), modifier = Modifier.weight(1f))
            BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarReparto)
        }
        Column(Modifier.fillMaxWidth().padding(start = Espacios.e5, end = Espacios.e5, bottom = Espacios.e5), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            CampoNativo(
                etiqueta = null, valor = buscado, alCambiar = { buscado = it }, modifier = Modifier.fillMaxWidth(),
                ejemplo = "Buscar o crear", iconoFinal = Iconos.search, nombreAccesible = "Buscar o crear personaje",
            )
            Conmutador(nombrado) { nombrado = it }
            if (seleccion.cantidad > 0) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e1)) {
                    seleccion.elegidos.forEach { elegido ->
                        Ficha(ReglasDelCapitulo.nombreDePersonaje(libro, elegido.id), elegido.nombrado, alto = 34.dp, marcada = true, descripcion = "Quitar de la selección") {
                            seleccion = seleccion.quitar(elegido.id)
                        }
                    }
                }
            }
            Column(
                Modifier.fillMaxWidth().heightIn(max = 336.dp).verticalScroll(rememberScrollState())
                    .drawBehind { drawRect(colores.superficieAlta, Offset.Zero, Size(size.width, 1.dp.toPx())) },
            ) {
                lista.forEach { personaje ->
                    FilaDePersonaje(personaje, seleccion.contiene(personaje.id)) { seleccion = seleccion.alternar(personaje.id, nombrado) }
                }
                if (paraCrear != null) {
                    val ocupado = creador.creando != null
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 56.dp).alpha(if (ocupado) 0.5f else 1f)
                            .clickable(enabled = !ocupado, role = Role.Button) {
                                creador.crear(libro, paraCrear) { id ->
                                    seleccion = seleccion.anadir(id, nombrado)
                                    buscado = ""
                                }
                            },
                        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        CirculoDeCrear(36.dp)
                        Text(if (creador.creando == paraCrear) "Creando «$paraCrear»…" else "Crear «$paraCrear»", style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.primario), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                if (lista.isEmpty() && buscado.isBlank()) {
                    Text(
                        "Ya están todos en la escena.",
                        style = Textos.cuerpo.copy(fontSize = rem(0.8), color = colores.tintaSuave),
                        modifier = Modifier.padding(vertical = Espacios.e3),
                    )
                }
            }
            Boton(
                if (seleccion.cantidad > 0) "Añadir ${seleccion.cantidad}" else "Añadir",
                {
                    vm.anadirPersonajes(escena.clave, seleccion)
                    vm.cerrarReparto()
                },
                Modifier.fillMaxWidth(),
                habilitado = seleccion.cantidad > 0,
            )
        }
    }
}

/** «En escena / Solo nombrado»: dos mitades de 40 dp en una píldora; la elegida, rellena del primario. */
@Composable
private fun Conmutador(nombrado: Boolean, alCambiar: (Boolean) -> Unit) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth().clip(Radios.pildora).background(colores.superficieContenedor).padding(4.dp)) {
        listOf(false to "En escena", true to "Solo nombrado").forEach { (valor, texto) ->
            val elegida = valor == nombrado
            Box(
                Modifier.weight(1f).height(40.dp).clip(Radios.pildora).background(if (elegida) colores.primario else Color.Transparent)
                    .clickable(role = Role.Tab) { alCambiar(valor) }.semantics { selected = elegida },
                contentAlignment = Alignment.Center,
            ) { Text(texto, style = Textos.cuerpo.copy(fontSize = 14.sp, fontWeight = FontWeight.Bold, lineHeight = 1.2.em, color = if (elegida) colores.sobrePrimario else colores.tintaSuave)) }
        }
    }
}

/** La inicial del personaje en un círculo del contenedor secundario. */
@Composable
private fun Inicial(nombre: String, tamano: Dp) {
    val colores = LocalColores.current
    Box(Modifier.size(tamano).clip(CircleShape).background(colores.contenedorSecundario), contentAlignment = Alignment.Center) {
        Text(nombre.trim().take(1).uppercase(), style = Textos.cuerpo.copy(fontSize = if (tamano < 34.dp) 13.sp else 15.sp, fontWeight = FontWeight.Bold, lineHeight = 1.em, color = colores.tinta))
    }
}

/** El «+» en un círculo discontinuo del primario, delante de «Crear «…»». */
@Composable
private fun CirculoDeCrear(tamano: Dp) {
    val colores = LocalColores.current
    Box(
        Modifier.size(tamano).drawBehind {
            val ancho = 2.dp.toPx()
            drawCircle(colores.primario, radius = size.minDimension / 2 - ancho / 2, style = Stroke(ancho, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx()))))
        },
        contentAlignment = Alignment.Center,
    ) { Icon(painterResource(Iconos.add), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp)) }
}

/** Una fila de la lista: la inicial, el nombre y la casilla; tocar cualquier parte la marca o la desmarca. */
@Composable
private fun FilaDePersonaje(personaje: Personaje, marcado: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp)
            .drawBehind { drawRect(colores.superficieAlta, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .clickable(role = Role.Checkbox, onClick = alPulsar)
            .semantics { selected = marcado },
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Inicial(personaje.nombre, 36.dp)
        Text(personaje.nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.SemiBold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
        val forma = RoundedCornerShape(6.dp)
        Box(
            Modifier.padding(end = 4.dp).size(24.dp).clip(forma)
                .background(if (marcado) colores.primario else Color.Transparent)
                .border(2.dp, if (marcado) colores.primario else colores.contornoFuerte, forma),
            contentAlignment = Alignment.Center,
        ) { if (marcado) Icon(painterResource(Iconos.check), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(18.dp)) }
    }
}

/**
 * Una ficha de personaje: presente, rellena del contenedor primario; solo nombrado, «@ Nombre» en cursiva con borde (en la
 * hoja, discontinuo). [alto] es lo que se ve; el objetivo táctil es de 44 dp.
 */
@Composable
private fun Ficha(nombre: String, nombrado: Boolean, alto: Dp, marcada: Boolean, descripcion: String, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(Modifier.heightIn(min = 44.dp).clickable(role = Role.Button, onClickLabel = descripcion, onClick = alPulsar), contentAlignment = Alignment.Center) {
        Row(
            Modifier.height(alto).clip(Radios.pildora)
                .background(if (nombrado) Color.Transparent else colores.contenedorPrimario)
                .drawBehind {
                    if (!nombrado) return@drawBehind
                    val ancho = 1.dp.toPx()
                    drawRoundRect(
                        colores.contornoFuerte, Offset(ancho / 2, ancho / 2), Size(size.width - ancho, size.height - ancho), CornerRadius(size.height / 2),
                        style = Stroke(ancho, pathEffect = if (marcada) PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx())) else null),
                    )
                }
                .padding(horizontal = if (alto > 32.dp) Espacios.e3 else 10.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (marcada && !nombrado) Icon(painterResource(Iconos.check), contentDescription = null, tint = colores.sobreContenedorPrimario, modifier = Modifier.size(16.dp))
            Text(
                if (nombrado) "@ $nombre" else nombre,
                style = Textos.cuerpo.copy(
                    fontSize = if (alto > 32.dp) 14.sp else 13.sp, lineHeight = 1.2.em,
                    fontWeight = if (nombrado) FontWeight.Normal else FontWeight.SemiBold,
                    fontStyle = if (nombrado) FontStyle.Italic else FontStyle.Normal,
                    color = if (nombrado) colores.tintaSuave else colores.sobreContenedorPrimario,
                ),
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 220.dp),
            )
        }
    }
}

/** Un personaje de la escena: al tocarlo, pasarlo a solo nombrado (o a presente) o quitarlo. */
@Composable
internal fun FichaDePersonaje(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable, personaje: PersonajeEnEscena) {
    val colores = LocalColores.current
    val nombre = ReglasDelCapitulo.nombreDePersonaje(libro, personaje.id)
    var abierto by remember { mutableStateOf(false) }
    Box {
        Ficha(nombre, personaje.nombrado, alto = 32.dp, marcada = false, descripcion = "Cambiar o quitar a $nombre") { abierto = true }
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

/** «+» tras las fichas: 36 dp sobre el contenedor de la superficie, 44 de objetivo; abre la hoja de reparto. */
@Composable
internal fun BotonDeAnadirPersonaje(alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(
        Modifier.size(44.dp).clip(CircleShape).clickable(role = Role.Button, onClick = alPulsar).semantics { contentDescription = "Añadir personaje" },
        contentAlignment = Alignment.Center,
    ) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(colores.superficieContenedor), contentAlignment = Alignment.Center) {
            Icon(painterResource(Iconos.add), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp))
        }
    }
}

/**
 * La tarjeta de la @ del texto: hasta cuatro personajes que coinciden con lo escrito (tocar el nombre lo pone en escena;
 * la @ de la derecha, como solo nombrado) y «Crear «…»». Elegir cambia lo escrito desde la @ por su nombre.
 */
@Composable
internal fun SugerenciasDeMencion(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable, creador: CreadorDePersonajes, consulta: String, sustituir: (String) -> Unit) {
    val colores = LocalColores.current
    val coinciden = remember(libro, consulta) { RepartoDeEscena.filtrar(libro.personajes, consulta).take(4) }
    val paraCrear = RepartoDeEscena.nombreParaCrear(consulta)
    if (coinciden.isEmpty() && paraCrear == null) return
    val forma = RoundedCornerShape(14.dp)
    Column(
        Modifier.widthIn(min = 220.dp, max = 260.dp).sombra2(forma, colores).clip(forma)
            .background(colores.superficie).border(1.dp, colores.contorno, forma).padding(6.dp),
    ) {
        coinciden.forEach { personaje ->
            Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(
                    Modifier.weight(1f).heightIn(min = 48.dp).clip(RoundedCornerShape(10.dp))
                        .clickable(role = Role.Button, onClickLabel = "En escena") {
                            sustituir(personaje.nombre)
                            vm.asignarPersonaje(escena.clave, personaje.id, false)
                        }
                        .padding(horizontal = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Inicial(personaje.nombre, 30.dp)
                    Text(personaje.nombre, style = Textos.cuerpo.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Box(
                    Modifier.size(44.dp).clip(CircleShape)
                        .clickable(role = Role.Button) {
                            sustituir(personaje.nombre)
                            vm.asignarPersonaje(escena.clave, personaje.id, true)
                        }
                        .semantics { contentDescription = "${personaje.nombre}, solo nombrado" },
                    contentAlignment = Alignment.Center,
                ) { Icon(painterResource(Iconos.alternateEmail), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(20.dp)) }
            }
        }
        if (paraCrear != null) {
            val ocupado = creador.creando != null
            Row(
                Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(10.dp)).alpha(if (ocupado) 0.5f else 1f)
                    .clickable(enabled = !ocupado, role = Role.Button) {
                        sustituir(paraCrear)
                        creador.crear(libro, paraCrear) { id -> vm.asignarPersonaje(escena.clave, id, false) }
                    }
                    .padding(horizontal = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CirculoDeCrear(30.dp)
                Text("Crear «$paraCrear»", style = Textos.cuerpo.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold, color = colores.primario), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
