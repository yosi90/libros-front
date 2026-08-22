# Petición backend: preferencias de interfaz multidispositivo

## Qué se necesita

Solicitamos un contrato autenticado y actor-scoped para leer y actualizar preferencias de interfaz de la cuenta. El primer alcance necesario es el tema solicitado por el usuario:

- `wood`, `light` o `dark` como valor persistido;
- versión o ETag para actualización optimista;
- fecha de última modificación en UTC;
- `GET` idempotente que devuelva valores por defecto cuando todavía no exista registro;
- `PATCH` parcial que no sobrescriba preferencias ajenas a los campos enviados;
- respuesta de conflicto distinguible cuando otro dispositivo haya escrito una versión posterior.

Una forma compatible sería `GET|PATCH /usuarios/me/preferencias-interfaz`, sin identificador de usuario controlado por cliente. La nomenclatura final pertenece al backend, pero debe quedar descrita en OpenAPI y mantener las propiedades de dominio con el casing canónico de la API.

## Por qué se necesita

El frontend ya conserva el tema localmente y lo sincroniza entre pestañas del mismo navegador. Esa persistencia no acompaña a la persona al iniciar sesión en otro móvil, plegable, tablet u ordenador. Resolverlo únicamente con `localStorage` no permite sincronización entre dispositivos y usar una escritura ciega podría perder la elección más reciente.

Wood sigue siendo una preferencia válida de cuenta aunque el dispositivo actual no pueda aplicarla: en composición no desktop el tema efectivo es dark, pero el valor solicitado debe conservarse para restaurar wood al volver a escritorio.

## Qué se espera lograr

1. Al iniciar sesión, fusionar la preferencia remota con la local de forma determinista.
2. Mantener una elección local inmediata incluso si la red falla y sincronizarla al recuperar conexión.
3. Propagar cambios posteriores entre dispositivos sin sobrescrituras silenciosas.
4. Cerrar sesión sin borrar necesariamente la preferencia visual del dispositivo, evitando a la vez asociar datos de una cuenta a otra.
5. Permitir que el contrato crezca en el futuro con preferencias puramente visuales sin mezclar notificaciones, privacidad, actividad o chat, que ya tienen contratos propios.

## Criterios de seguridad y alcance

- El actor se obtiene de la sesión; no se acepta un `userId` arbitrario en ruta o payload.
- No se incluyen tokens, datos narrativos ni contenido privado en la preferencia.
- La respuesta no debe ser cacheable por caches compartidas. Si se permite revalidación HTTP, debe ser privada y variar por autorización.
- Una versión desconocida, un tema inválido o un conflicto debe producir un error estructurado y documentado, no normalizarse silenciosamente.
- No se solicita cola genérica de escritura offline. El frontend solo enviará la última preferencia local conocida cuando recupere conectividad y exista una política de conflicto documentada.

## Estado de respuesta

Pendiente de implementación backend, contrato y actualización del OpenAPI.
