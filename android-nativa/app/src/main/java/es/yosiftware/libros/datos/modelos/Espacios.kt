package es.yosiftware.libros.datos.modelos

import es.yosiftware.sesion.EspacioDeYosiftware
import es.yosiftware.sesion.InvitacionAEspacio
import es.yosiftware.sesion.SolicitudDeEntrada

// Los espacios de la plataforma tal como los usa Libros (`interfaces/platform-spaces.ts` de la web; ecosistema-kit/
// ESPACIOS.md). Cada club es un espacio con `idExterno` `club-<Id>`: la plataforma lleva quién está, con qué rol y cómo
// se entra, y Libros todo lo demás del club. Los modelos son los de la librería de la sesión (1.10.0:
// `EspacioDeYosiftware`, `InvitacionAEspacio`, `SolicitudDeEntrada`, `InvitacionEnviada`, `ResumenSocial`…); aquí solo
// queda lo propio de Libros: de qué club es un espacio y cómo se nombra a una persona.

/** El club de Libros de un espacio (`clubIdFromSpace`): `club-<Id>`, o `null` si no es de un club. */
fun clubDeEspacio(idExterno: String?): Int? =
    Regex("^club-(\\d+)$").find(idExterno.orEmpty())?.groupValues?.get(1)?.toIntOrNull()?.takeIf { it > 0 }

/** El club de Libros del espacio, o `null` si es de otra cosa. */
val EspacioDeYosiftware.clubId: Int? get() = clubDeEspacio(idExterno)

/** El club de Libros del espacio de la invitación, o `null` si es de otra cosa. */
val InvitacionAEspacio.clubId: Int? get() = clubDeEspacio(idExterno)

/** Cómo se nombra en los clubes a una persona de la plataforma (`clubPersonName`): su nombre o `@alias`. */
fun nombreVisible(nombre: String?, alias: String): String = nombre?.takeIf { it.isNotBlank() } ?: "@$alias"

val SolicitudDeEntrada.visible: String get() = nombreVisible(nombre, alias)

/**
 * La persona de la búsqueda para invitar (`sesion.social.buscarPersonas`). Es la de la librería, que se llama igual que
 * la [PersonaDeYosiftware] de Libros (la del chat, los avisos y las novedades): por eso va con el paquete entero.
 */
val es.yosiftware.sesion.PersonaDeYosiftware.visible: String get() = nombreVisible(nombre, alias)
