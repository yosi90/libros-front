package es.yosiftware.libros.datos.modelos

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La colección, las peticiones de catálogo, los reportes y el contenido propio de los clubes. */
class ComunidadYPeticionesTest {
    @Test
    fun loGuardadoEnLaColeccion() {
        val valoracion = Valoracion.de(JSONObject("""{"success": true, "Puntuacion": 3, "Resena": "Buena selección.", "ResenaOculta": false}"""))
        assertEquals(Valoracion(3, "Buena selección.", false), valoracion)
        assertNull(Valoracion.de(JSONObject("""{"success": true, "Resena": null, "ResenaOculta": false}""")).resena)
        // `normalizeAnthologySectionContext`: los ids pueden venir como texto.
        val contexto = ContextoDeSeccion.de(
            JSONObject(
                """{"AntologiaId": "9", "LibroId": "31", "EstadoActual": {"Id": "12", "EstadoId": "2", "Nombre": "Leído", "Fecha": "2026-06-26T10:30:00"},
                    "Estados": [{"Id": 12, "EstadoId": 2, "Nombre": "Leído", "Fecha": "2026-06-26T10:30:00"}], "Puntuacion": "4", "Resena": null, "FechaActualizacion": null}""",
            ),
        )
        assertEquals(9, contexto.antologiaId)
        assertEquals(31, contexto.libroId)
        assertEquals(TipoDeEstado.LEIDO, contexto.estadoActual?.tipo)
        assertEquals(4, contexto.puntuacion)
    }

    @Test
    fun unaPeticionDeCatalogo() {
        val peticion = PeticionDeCatalogo.de(
            JSONObject(
                """{"Id": 12, "Usuario": {"Id": 5, "Nombre": "Ada"}, "TipoEntidad": "libro", "Accion": "alta", "EntidadId": null, "ISBN": "9788445016763",
                    "GrupoISBN": 3, "Participantes": 2, "Payload": {"Nombre": "El Hobbit", "Autores": [1]}, "Estado": "devuelta",
                    "ComentarioResolucion": "Falta la fecha.", "FechaCreacion": "2026-09-01T00:00:00", "FechaResolucion": null}""",
            ),
        )
        assertEquals("devuelta", peticion.estado)
        assertNull(peticion.entidadId)
        assertEquals("El Hobbit", peticion.payload.getString("Nombre"))
        assertEquals(2, peticion.participantes)
        val creada = PeticionCreada.de(JSONObject("""{"success": true, "Id": 13, "Estado": "pendiente", "GrupoISBN": 3}"""), 201)
        assertEquals(201, creada.estadoHttp)
        assertEquals(3, creada.grupoIsbn)
        val resuelta = PeticionResuelta.de(JSONObject("""{"success": true, "Id": 13, "Estado": "aprobada", "EntidadId": 53, "EdicionId": 201, "ParticipantesResueltos": 2}"""))
        assertEquals(201, resuelta.edicionId)
    }

    @Test
    fun unGrupoDeReportes() {
        val grupo = GrupoDeReportes.de(
            JSONObject(
                """{"Id": 2, "TipoFuente": "resena", "EntidadTipo": "libro", "EntidadId": 7, "Estado": "aceptado", "TotalReportes": 2,
                    "Fuente": {"Usuario": {"Id": 5, "Nombre": "Ada"}, "Item": {"Id": 7, "Tipo": "libro", "Nombre": "X"}, "Resena": "Spoiler", "ResenaOculta": true},
                    "Reportes": [{"Id": 1, "Usuario": {"Id": 6, "Nombre": "Mara"}, "Motivo": "Destripa el final", "FechaCreacion": "2026-09-01T00:00:00"}],
                    "Resolucion": {"Estado": "aceptado", "Comentario": null, "Moderador": {"Id": 1, "Nombre": "Yosi"}, "FechaResolucion": "2026-09-02T00:00:00"}}""",
            ),
        )
        assertEquals(Referencia(7, "X"), grupo.fuente?.obra)
        assertEquals("libro", grupo.fuente?.tipoObra)
        assertTrue(grupo.fuente!!.resenaOculta)
        assertEquals("Destripa el final", grupo.reportes.single().motivo)
        assertEquals("Yosi", grupo.resolucion?.moderador?.nombre)
        assertEquals(ReporteCreado(1, 2, "pendiente"), ReporteCreado.de(JSONObject("""{"success": true, "Id": 1, "GrupoId": 2, "Estado": "pendiente"}""")))
    }

    @Test
    fun elResumenDeClubes() {
        val resumen = ResumenDeClubes.de(
            JSONObject(
                """{"success": true, "TieneClubes": true,
                    "ClubesPropios": [{"Id": 1, "Nombre": "Club", "DescripcionMarkdown": null, "Visibilidad": "abierto", "PropietarioId": 5,
                                       "Objetivo": {"Tipo": "saga", "Id": 4}, "Miembros": 8, "FechaActualizacion": "2026-10-01T00:00:00Z",
                                       "Rol": "propietario", "FechaIncorporacion": "2026-01-01T00:00:00Z", "RetiradoDescubrimiento": false}],
                    "ProximosEventos": [{"Id": 3, "Club": {"Id": 1, "Nombre": "Club", "Visibilidad": "abierto"}, "HitoId": null, "Titulo": "Quedada",
                                         "DescripcionMarkdown": null, "FechaInicio": "2026-11-01T18:00:00Z", "FechaFin": null, "EnCurso": false,
                                         "Destino": {"Tipo": "evento", "Id": 3}}],
                    "ActividadReciente": [], "ClubesPublicosActivos": [{"Id": 2, "Nombre": "Otro", "Visibilidad": "abierto", "PropietarioId": 6, "Objetivo": {"Tipo": "libro", "Id": null},
                                         "Miembros": 3, "FechaActualizacion": "2026-10-01T00:00:00Z", "Actividad30Dias": {"Puntuacion": 9, "Total": 5, "Variedad": 2}, "UltimaActividad": "2026-10-02T00:00:00Z"}],
                    "BandejasAcceso": {"Solicitudes": {"EnviadasPendientes": 0, "RecibidasPendientes": 1}, "Invitaciones": {"EnviadasPendientes": 0, "RecibidasPendientes": 0}},
                    "Cursores": {"Eventos": null, "Actividad": null}}""",
            ),
        )
        assertTrue(resumen.tieneClubes)
        val propio = resumen.clubesPropios.single()
        assertEquals("propietario", propio.rol)
        assertEquals(ObjetivoDeClub("saga", 4), propio.objetivo)
        assertEquals(DestinoEnClub("evento", 3), resumen.proximosEventos.single().destino)
        assertNull(resumen.clubesPublicosActivos.single().objetivo?.id)
        assertEquals(5, resumen.clubesPublicosActivos.single().actividad30Dias?.total)
    }

    @Test
    fun elDescubrimientoYMisClubes() {
        val pagina = PaginaDeClubes.de(
            JSONObject(
                """{"success": true, "Clubes": [{"Id": 2, "Nombre": "Otro", "Visibilidad": "cerrado", "PropietarioId": 6, "Objetivo": null, "Miembros": 3,
                    "FechaActualizacion": "2026-10-01T00:00:00Z", "EstadoMembresia": "solicitud_pendiente"}], "SiguienteCursor": {"cursorFecha": "2026-10-01T00:00:00Z", "cursorId": 2}}""",
            ),
        )
        assertEquals("solicitud_pendiente", pagina.clubes.single().estadoMembresia)
        assertEquals(CursorDeClubes("2026-10-01T00:00:00Z", 2), pagina.siguiente)
        assertNull(PaginaDeClubes.de(JSONObject("""{"Clubes": [], "SiguienteCursor": null}""")).siguiente)
        val mios = MisClubes.de(JSONObject("""{"success": true, "TieneClubes": false, "Total": 0, "Clubes": []}"""))
        assertFalse(mios.tieneClubes)
        val eventos = PaginaDeEventos.de(JSONObject("""{"Eventos": [], "SiguienteCursor": {"cursorFechaInicio": "2026-11-01T18:00:00Z", "cursorId": 3}}"""))
        assertEquals(CursorDeEventos("2026-11-01T18:00:00Z", 3), eventos.siguiente)
    }

    @Test
    fun elDetalleYElContenidoDeUnClub() {
        val club = DetalleDeClub.de(
            JSONObject(
                """{"Id": 1, "Nombre": "Club", "DescripcionMarkdown": "**Hola**", "Visibilidad": "abierto", "PropietarioId": 5,
                    "MiembrosDetalle": [{"Id": 5, "Nombre": "Ada", "Imagen": null, "Rol": "propietario"}], "SiguienteCursorMiembros": {"cursorId": 5},
                    "Metricas": {"MiembrosActivos": 4, "Publicaciones": 10, "Mensajes": 30}}""",
            ),
        )
        assertEquals("propietario", club.miembros.single().rol)
        assertEquals(5, club.siguienteCursorMiembros)
        assertEquals(30, club.mensajes)
        val lectura = LecturaDeClub.de(JSONObject("""{"Id": 2, "Objetivo": {"Tipo": "libro", "Id": 7}, "FechaInicio": null, "FechaFin": null, "ObjetivoTexto": null, "Activa": true, "FechaCierre": null}"""))
        assertTrue(lectura.activa)
        val progreso = ProgresoEnClub.de(JSONObject("""{"LecturaId": 2, "PaginaActual": 120, "CapituloActual": null, "Compartir": true, "FechaActualizacion": "2026-10-01T00:00:00Z"}"""))
        assertEquals(120.0, progreso.paginaActual!!, 0.0)
        val hito = HitoDeClub.de(JSONObject("""{"Id": 4, "LecturaId": 2, "Tipo": "pagina", "ReferenciaInicio": 100, "ReferenciaFin": 150, "Titulo": "Mitad", "ObjetivoTexto": null, "FechaOrientativa": null}"""))
        assertEquals("pagina", hito.tipo)
        val evento = EventoDeClub.de(JSONObject("""{"Id": 3, "HitoId": 4, "Titulo": "Quedada", "DescripcionMarkdown": null, "FechaInicio": "2026-11-01T18:00:00Z", "FechaFin": null}"""))
        assertEquals(4, evento.hitoId)
    }

    @Test
    fun unDebateConSusComentarios() {
        // El ejemplo de `community.service.spec.ts`.
        val detalle = DetalleDeDebate.de(
            JSONObject(
                """{"success": true, "Debate": {"Id": 8, "LecturaId": null, "HitoId": null, "Autor": {"Id": 2, "Nombre": "Ada", "Imagen": null}, "Titulo": "Ritmo",
                    "ContenidoMarkdown": "Texto", "Spoiler": {}, "FechaCreacion": "2026-07-14T10:00:00Z"},
                    "Comentarios": [{"Id": 9, "Autor": {"Id": 4, "Nombre": "Mara", "Imagen": null}, "ContenidoMarkdown": "Respuesta", "Spoiler": {"PaginaInicio": 10, "Oculto": true}, "FechaCreacion": "2026-07-14T11:00:00Z"}]}""",
            ),
        )
        assertEquals("Ritmo", detalle.debate.titulo)
        assertEquals(Persona(2, "Ada", null), detalle.debate.autor)
        assertFalse(detalle.debate.spoiler.oculto)
        assertTrue(detalle.comentarios.single().spoiler.oculto)
        assertEquals(10.0, detalle.comentarios.single().spoiler.paginaInicio!!, 0.0)
    }

    @Test
    fun unaEncuestaConElVotoComoTokenOpaco() {
        val encuesta = EncuestaDeClub.de(
            JSONObject(
                """{"Id": 5, "Pregunta": "¿Siguiente?", "FechaCierre": "2026-11-01T00:00:00Z", "Cerrada": false, "MiVotoId": 2, "MiVotoVersion": "0a1b2c3d4e5f6789",
                    "Opciones": [{"Id": 1, "Texto": "A", "TotalVotos": null}, {"Id": 2, "Texto": "B", "TotalVotos": 3}]}""",
            ),
        )
        assertEquals("0a1b2c3d4e5f6789", encuesta.miVotoVersion)
        assertNull(encuesta.opciones[0].totalVotos)
        assertEquals(3, encuesta.opciones[1].totalVotos)
        // La web lo tipaba como número: también se lee.
        assertEquals("7", EncuestaDeClub.de(JSONObject("""{"Id": 5, "MiVotoVersion": 7, "Opciones": []}""")).miVotoVersion)
    }
}
