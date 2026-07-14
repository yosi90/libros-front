# Petición backend: identidad resumida en alegaciones administrativas

## Qué se necesita

Que `ModerationAdminAppeal` incluya un resumen autorizado del usuario (`Id`, `Nombre` y, si el rol lo permite, email) además de `UsuarioId`.

## Por qué se necesita

Administración solo recibe un ID para identificar a la persona que presenta la alegación. Ocultarlo sin una referencia humana dejaría la cola sin contexto operativo.

## Qué se espera lograr

Gestionar alegaciones por identidad humana y conservar `UsuarioId` exclusivamente para las peticiones internas de resolución e historial.

## Respuesta backend

ACEPTADA. La cola administrativa incluye `Usuario { Id, Nombre, Email }`; las superficies propias continúan sin exponer datos administrativos.
