package es.yosiftware.libros.ui.catalogo

import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.ui.libro.SitioDelTitulo
import es.yosiftware.libros.ui.libro.TituloDelLibro
import es.yosiftware.libros.datos.fechaCorta
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.ResenaPublica
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.biblioteca.iconoDeEstado
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Chip
import es.yosiftware.libros.ui.componentes.MarcoDeBarraDePantallaCompleta
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.componentes.TextoEyebrow
import es.yosiftware.libros.ui.componentes.TextoTitulo
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2

/**
 * La ficha pública de una obra del catálogo (`.m-detail`, a pantalla completa): portada, nombre, autoría y nota media;
 * las acciones («Actualizar lectura» y «Abrir lectura», o «Añadir como…»); los datos; las ediciones; lo de la persona;
 * la comunidad lectora y las reseñas, de tres en tres.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PantallaFicha(vm: CatalogoViewModel, ficha: FichaPublica, alAbrirLectura: (Obra) -> Unit) {
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val obra = ficha.obra
    BackHandler(onBack = vm::cerrarFicha)

    Column(Modifier.fillMaxSize().background(colores.lienzo).clickable(enabled = false) {}) {
        BarraDePantallaCompleta(
            titulo = "Ficha pública",
            izquierda = { BotonDeIcono(Iconos.arrowBack, "Volver al catálogo", vm::cerrarFicha) },
            derecha = { BotonDeIcono(Iconos.rateReview, "Proponer corrección", vm::proponerCorreccion) },
        )
        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
            Column(
                Modifier.widthIn(max = 920.dp).fillMaxWidth().verticalScroll(rememberScrollState())
                    .padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e5, bottom = maxOf(Espacios.e8, zona.calculateBottomPadding())),
            ) {
                // `.m-detail__hero`
                Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e5), verticalAlignment = Alignment.CenterVertically) {
                    val forma = RoundedCornerShape(Radios.sm)
                    Portada(ficha.portada, "Portada de ${obra.nombre}", Modifier.width(if (ancha) 160.dp else 112.dp).aspectRatio(2f / 3f).sombra2(forma, colores).clip(forma))
                    Column(Modifier.weight(1f)) {
                        TextoEyebrow(if (obra.esAntologia) "Antología" else "Libro")
                        TextoTitulo(ficha.titulo)
                        TextoDeApoyo(ficha.autores)
                        Text(ficha.notaMedia, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.primario), modifier = Modifier.padding(top = Espacios.e3))
                    }
                }

                // `.m-detail__actions`
                if (ficha.enColeccion) {
                    FlowRow(Modifier.fillMaxWidth().padding(top = Espacios.e6), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        Boton("Actualizar lectura", { vm.abrirEditor(obra) }, variante = VarianteDeBoton.Tonal, icono = Iconos.edit)
                        if (!obra.esAntologia) Boton("Abrir lectura", { vm.abrirLectura()?.let(alAbrirLectura) }, icono = Iconos.menuBook)
                    }
                } else {
                    Column(Modifier.fillMaxWidth().padding(top = Espacios.e6), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        Text("Añadir como…", style = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                            TipoDeEstado.entries.forEach { estado ->
                                Chip(estado.nombre, icono = iconoDeEstado(estado), alPulsar = if (vm.guardando) null else ({ vm.anadirComo(obra, estado) }))
                            }
                        }
                    }
                }

                if (ficha.cargando) Aviso(Iconos.hourglassTop, "Cargando datos públicos…")
                if (ficha.fallo) Aviso(Iconos.info, "Las estadísticas públicas no están disponibles.")

                // `.m-detail__meta`
                Tarjeta(Modifier.fillMaxWidth().padding(top = Espacios.e6)) {
                    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                            Dato("ISBN", ficha.isbn, Modifier.weight(1f))
                            Dato("Publicación", ficha.fechaDePublicacion, Modifier.weight(1f))
                        }
                        Dato("En el catálogo", ficha.enElCatalogo, Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                            Dato("Idiomas", ficha.idiomas, Modifier.weight(1f))
                            Dato("Estilos", ficha.estilos, Modifier.weight(1f))
                        }
                    }
                }

                if (ficha.ediciones.isNotEmpty()) Ediciones(vm, ficha)

                if (ficha.enColeccion) {
                    Tarjeta(Modifier.fillMaxWidth().padding(top = Espacios.e6)) {
                        TextoEyebrow("Mi biblioteca", Modifier.padding(top = Espacios.e2))
                        Text(ficha.estadoPropio.ifEmpty { "Sin estado" }, style = tituloH3.copy(color = colores.tinta))
                        ficha.puntuacionPropia?.takeIf { it > 0 }?.let {
                            Text("$it de 5 estrellas", style = Textos.cuerpo.copy(color = colores.tinta), modifier = Modifier.padding(top = Espacios.e2))
                        }
                        if (ficha.resenaPropia.isNotEmpty()) Cita(ficha.resenaPropia)
                        if (!ficha.obra.esAntologia) TituloDelLibro(ficha.obra.id, SitioDelTitulo.FRANJA, Modifier.padding(top = Espacios.e4))
                    }
                }

                ficha.detalle?.estadisticas?.let { estadisticas ->
                    Column(Modifier.fillMaxWidth().padding(top = Espacios.e6)) {
                        TextoEyebrow("Comunidad lectora")
                        Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                            Metrica(estadisticas.usuariosEnBiblioteca, "bibliotecas", Modifier.weight(1f))
                            Metrica(estadisticas.totalLeidos, "lecturas", Modifier.weight(1f))
                            Metrica(estadisticas.totalEnMarcha, "en marcha", Modifier.weight(1f))
                        }
                        // El ritmo de sus lectores y la evolución de la nota (F2 y F3): solo con datos (tres lectores o más).
                        val ritmo = listOfNotNull(
                            estadisticas.ritmoLectores?.let { Catalogo.hastaUnDecimal(it) to "págs. por día de lectura" },
                            estadisticas.diasMediosParaTerminar?.let { Catalogo.hastaUnDecimal(it) to "días para terminarlo" },
                        )
                        if (ritmo.isNotEmpty()) {
                            Row(Modifier.fillMaxWidth().padding(top = Espacios.e2).height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                                ritmo.forEach { (valor, nombre) -> Metrica(valor, nombre, Modifier.weight(1f)) }
                            }
                        }
                        if (estadisticas.evolucionNota.isNotEmpty()) {
                            TextoEyebrow("Evolución de la nota", Modifier.padding(top = Espacios.e4))
                            estadisticas.evolucionNota.chunked(3).forEach { fila ->
                                Row(Modifier.fillMaxWidth().padding(top = Espacios.e2).height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                                    fila.forEach { mes -> Metrica(Catalogo.hastaDosDecimales(mes.nota ?: 0.0), Catalogo.mesCorto(mes.anio, mes.mes), Modifier.weight(1f)) }
                                    repeat(3 - fila.size) { Box(Modifier.weight(1f)) }
                                }
                            }
                        }
                    }
                }

                Resenas(vm, ficha)
            }
        }
    }
}

/**
 * `.m-fullscreen-surface__bar` ([MarcoDeBarraDePantallaCompleta]) con tres columnas: 48 dp, el título centrado en
 * negrita y 48 dp.
 */
@Composable
internal fun BarraDePantallaCompleta(titulo: String, izquierda: @Composable () -> Unit, derecha: @Composable () -> Unit) {
    val colores = LocalColores.current
    MarcoDeBarraDePantallaCompleta {
        izquierda()
        Text(
            titulo,
            style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta, textAlign = TextAlign.Center),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f).align(Alignment.CenterVertically),
        )
        derecha()
    }
}

/** `.m-detail__notice`: el aviso de carga o de fallo, en los colores de atención. */
@Composable
private fun Aviso(@DrawableRes icono: Int, texto: String) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().padding(top = Espacios.e4).clip(RoundedCornerShape(Radios.sm)).background(colores.contenedorAtencion).padding(Espacios.e3),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.atencion, modifier = Modifier.size(24.dp))
        Text(texto, style = Textos.cuerpo.copy(color = colores.atencion))
    }
}

/** Un `dt` y su `dd`: «Sin datos» si no hay. */
@Composable
private fun Dato(etiqueta: String, valor: String?, modifier: Modifier) {
    val colores = LocalColores.current
    Column(modifier) {
        Text(etiqueta, style = Textos.cuerpo.copy(fontSize = rem(0.7), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
        Text(valor?.takeIf { it.isNotEmpty() } ?: "Sin datos", style = Textos.cuerpo.copy(color = colores.tinta), modifier = Modifier.padding(top = 4.dp))
    }
}

/** `.m-detail__editions`: cada edición, la elegida con el borde primario, y el botón de tenerla o retirarla. */
@Composable
private fun Ediciones(vm: CatalogoViewModel, ficha: FichaPublica) {
    val colores = LocalColores.current
    val elegida = ficha.edicion
    val conError = ficha.errorDeEdicion.isNotEmpty()
    Column(Modifier.fillMaxWidth().padding(top = Espacios.e6)) {
        // El margen de 8 dp del `h3` se junta con los 24 de la sección, como en CSS.
        Text("Ediciones", style = tituloH3.copy(color = colores.tinta), modifier = Modifier.padding(bottom = Espacios.e2))
        Column(Modifier.fillMaxWidth().padding(bottom = Espacios.e3), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            ficha.ediciones.forEach { edicion ->
                val forma = RoundedCornerShape(Radios.sm)
                val borde = when {
                    conError -> colores.error
                    elegida?.id == edicion.id -> colores.primario
                    else -> colores.contornoFuerte
                }
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(forma).background(colores.superficie).border(1.dp, borde, forma)
                        .clickable { vm.elegirEdicion(edicion.id) }
                        .padding(Espacios.e3),
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(edicion.isbn?.takeIf { it.isNotEmpty() } ?: "Edición sin ISBN", style = Textos.cuerpo.copy(color = colores.tinta))
                    Text(edicion.fechaPublicacion?.takeIf { it.isNotEmpty() } ?: "Fecha desconocida", style = Textos.cuerpo.copy(fontSize = rem(0.833), color = colores.tintaSuave), modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (edicion.enMiBiblioteca) Text("La tienes", style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.primario))
                }
            }
        }
        if (elegida != null) {
            Boton(
                if (elegida.enMiBiblioteca) "Retirar esta edición" else "Tengo esta edición",
                vm::alternarEdicion,
                variante = VarianteDeBoton.Contorno,
                icono = if (elegida.enMiBiblioteca) Iconos.removeCircleOutline else Iconos.libraryAdd,
                habilitado = !vm.guardandoEdiciones,
            )
            if (elegida.enMiBiblioteca) TextoDeApoyo("Retirarla conserva la obra y su historial de lectura.", Modifier.padding(top = Espacios.e2))
        }
        if (conError) Text(ficha.errorDeEdicion, style = Textos.cuerpo.copy(color = colores.error), modifier = Modifier.padding(top = Espacios.e2))
    }
}

/** El `blockquote` de la reseña propia: 12 dp a la izquierda, tras una raya de 3 dp del contenedor primario. */
@Composable
private fun Cita(texto: String) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth().padding(top = Espacios.e4, bottom = Espacios.e4).height(IntrinsicSize.Min)) {
        Box(Modifier.width(3.dp).fillMaxHeight().background(colores.contenedorPrimario))
        Text(texto, style = Textos.cuerpo.copy(color = colores.tinta), modifier = Modifier.padding(start = Espacios.e3))
    }
}

/** Una cifra de la comunidad: el número en el primario y su nombre debajo. */
@Composable
private fun Metrica(valor: Int, nombre: String, modifier: Modifier) = Metrica(valor.toString(), nombre, modifier)

@Composable
private fun Metrica(valor: String, nombre: String, modifier: Modifier) {
    val colores = LocalColores.current
    Tarjeta(modifier.fillMaxHeight()) {
        Text(valor, style = Textos.cuerpo.copy(fontSize = rem(1.25), fontWeight = FontWeight.Bold, color = colores.primario, textAlign = TextAlign.Center), modifier = Modifier.fillMaxWidth())
        Text(nombre, style = Textos.cuerpo.copy(fontSize = rem(0.68), color = colores.tintaSuave, textAlign = TextAlign.Center), modifier = Modifier.fillMaxWidth().padding(top = 3.dp))
    }
}

/** Las reseñas públicas visibles, de tres en tres, con el paginador si hay más. */
@Composable
private fun Resenas(vm: CatalogoViewModel, ficha: FichaPublica) {
    val colores = LocalColores.current
    Column(Modifier.fillMaxWidth().padding(top = Espacios.e6)) {
        TextoEyebrow("Reseñas")
        // Los márgenes de arriba (12 dp las reseñas y 8 el texto) se juntan con los 8 de debajo del rótulo.
        ficha.resenasDeLaPagina.forEachIndexed { i, resena -> TarjetaDeResena(resena, arriba = if (i == 0) Espacios.e1 else Espacios.e3) }
        if (ficha.resenas.isEmpty()) TextoDeApoyo("No hay reseñas públicas visibles.")
        if (ficha.hayPaginasDeResenas) {
            Row(Modifier.fillMaxWidth().padding(top = Espacios.e4), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                Boton("Anterior", vm::paginaDeResenasAnterior, variante = VarianteDeBoton.Contorno, habilitado = ficha.paginaDeResenas > 0)
                Spacer(Modifier.weight(1f))
                Text("${ficha.paginaDeResenas + 1} / ${ficha.paginasDeResenas}", style = Textos.cuerpo.copy(color = colores.tinta))
                Spacer(Modifier.weight(1f))
                Boton("Siguiente", vm::paginaDeResenasSiguiente, variante = VarianteDeBoton.Contorno, habilitado = ficha.paginaDeResenas + 1 < ficha.paginasDeResenas)
            }
        }
    }
}

@Composable
private fun TarjetaDeResena(resena: ResenaPublica, arriba: Dp) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth().padding(top = arriba)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Text(Catalogo.alias(resena.usuario?.nombre), style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), modifier = Modifier.weight(1f))
            resena.puntuacion?.takeIf { it > 0 }?.let { Text("$it ★", style = Textos.cuerpo.copy(color = colores.tinta)) }
        }
        Text(resena.resena.orEmpty(), style = Textos.cuerpo.copy(lineHeight = 1.55.em, color = colores.tinta), modifier = Modifier.padding(vertical = Espacios.e4))
        fechaCorta(resena.fecha ?: resena.fechaCreacion)?.let {
            Text(it, style = Textos.cuerpo.copy(fontSize = rem(0.7), color = colores.tintaSuave))
        }
    }
}
