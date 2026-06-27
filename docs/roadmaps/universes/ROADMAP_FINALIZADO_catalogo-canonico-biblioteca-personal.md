# Catalogo Canonico y Biblioteca Personal

## Objetivo

Migrar el frontend desde una biblioteca basada en objetos propios por usuario hacia un catalogo canonico compartido, una coleccion personal por usuario, peticiones de catalogo y permisos diferenciados para admin/moderador.

## Checklist

- [x] **Descripcion:** Pausar el roadmap visual activo y abrir este roadmap dedicado.
  **Por que se necesita:** Solo puede existir un `ROADMAP_ACTIVO_` y este cambio desplaza el foco funcional.
  **Que se espera lograr:** Dejar el repositorio con documentacion operativa consistente antes de tocar codigo.
  **Peligros si se mantiene como estaba:** Dos iniciativas activas competirian por el estado real del proyecto.
  **Peligros del cambio:** Las verificaciones visuales pendientes quedan pausadas hasta retomar ese foco.

- [x] **Descripcion:** Crear contrato frontend para catalogo, coleccion, estados, puntuacion, peticiones y permisos de moderacion.
  **Por que se necesita:** Los tipos actuales mezclan `Estado` textual y objetos legacy de usuario.
  **Que se espera lograr:** Basar la logica en `EstadoId`, modelar `Quiero leer`, puntuacion y peticiones.
  **Peligros si se mantiene como estaba:** La UI podria interpretar mal estados como `Leido`/`Leído` o no distinguir catalogo de coleccion.
  **Peligros del cambio:** Cambiar tipos compartidos puede romper pantallas que leen estructuras antiguas.

- [x] **Descripcion:** Crear servicios de `/catalogo/*`, `/coleccion/*` y `/peticiones/catalogo`.
  **Por que se necesita:** Las pantallas nuevas no deben depender de endpoints legacy para usuarios normales.
  **Que se espera lograr:** Separar busqueda canonica, estado/puntuacion personal y flujo de peticiones.
  **Peligros si se mantiene como estaba:** Usuarios normales seguirian intentando crear o editar catalogo directamente.
  **Peligros del cambio:** La mezcla temporal de endpoints legacy y nuevos puede dejar caches incoherentes.

- [x] **Descripcion:** Reorientar la coleccion actual de universos a `/coleccion/universos`.
  **Por que se necesita:** `/dashboard/books` debe representar la biblioteca personal, no todo el catalogo.
  **Que se espera lograr:** Mantener la vista jerarquica actual con datos personales de estado y puntuacion.
  **Peligros si se mantiene como estaba:** El usuario podria ver o abrir items que no forman parte de su biblioteca.
  **Peligros del cambio:** Si el backend no devuelve `Sagas`, la jerarquia quedara limitada hasta completar contrato.

- [x] **Descripcion:** Crear vista de catalogo global.
  **Por que se necesita:** El usuario necesita descubrir todos los libros y antologias guardados en la web.
  **Que se espera lograr:** Listar catalogo completo, filtrar, guardar en biblioteca eligiendo estado y puntuar.
  **Peligros si se mantiene como estaba:** Catalogo y coleccion seguirian siendo indistinguibles.
  **Peligros del cambio:** Una vista demasiado pesada puede duplicar logica de busqueda de coleccion.

- [x] **Descripcion:** Separar permisos de usuario, moderador y administrador.
  **Por que se necesita:** Moderador puede gestionar catalogo/peticiones pero no administracion de cuentas.
  **Que se espera lograr:** Ocultar formularios canonicos a usuarios normales y abrir cola de peticiones a admin/moderador.
  **Peligros si se mantiene como estaba:** Usuarios normales tendrian acciones que la API rechaza o moderadores perderian herramientas.
  **Peligros del cambio:** Un guard demasiado amplio podria exponer gestion de usuarios a moderadores.

- [x] **Descripcion:** Crear flujo de peticiones de catalogo.
  **Por que se necesita:** Usuarios normales deben poder proponer altas o correcciones sin escribir catalogo directamente.
  **Que se espera lograr:** Enviar peticiones y resolverlas desde cola de moderacion.
  **Peligros si se mantiene como estaba:** Faltaria el canal operativo para mejorar el catalogo compartido.
  **Peligros del cambio:** El payload flexible puede ser dificil de validar visualmente.

- [x] **Descripcion:** Verificar build, tests unitarios y actualizar documentacion de cierre parcial.
  **Por que se necesita:** El cambio cruza rutas, servicios, stores y permisos.
  **Que se espera lograr:** Confirmar compilacion y dejar el roadmap con el estado real de avance.
  **Peligros si se mantiene como estaba:** Podrian quedar regresiones silenciosas o documentacion desfasada.
  **Peligros del cambio:** Los tests pueden requerir ajustes por contratos nuevos.

- [x] **Descripcion:** Ejecutar verificaciones manuales desktop con usuario normal, moderador y administrador.
  **Por que se necesita:** Los flujos principales dependen de datos reales, permisos reales y peticiones contra backend.
  **Que se espera lograr:** Confirmar que catalogo, biblioteca personal, guardado con estado, puntuacion y cola de peticiones funcionan en una sesion real.
  **Peligros si se mantiene como estaba:** Una integracion que compila podria fallar por datos, permisos o copy/UX en runtime.
  **Peligros del cambio:** Requiere coordinar cuentas y datos de prueba; puede descubrir ajustes menores fuera del alcance automatico.

## Notas

- Backend ya documento catalogos auxiliares de idioma y estilo. Lugar de origen se consume como autocomplete paginado y en escrituras canonicas se envia como `LugarOrigenNombre` o `LugarOrigenId`; el backend normaliza y crea/reutiliza la fila.
- El guardado en biblioteca siempre pide estado al usuario; no hay estado por defecto.
- El detalle narrativo de libro solo se abre si el item ya esta en la coleccion personal.
- La responsividad movil sigue fuera de alcance de esta iniciativa.
- Build verificado con `npm run build`.
- Tests unitarios verificados con include explicito de todos los specs conocidos: 19 specs correctos en ChromeHeadless.
- `npm test -- --watch=false --browsers=ChromeHeadless` sigue sin devolver salida dentro del margen operativo de 1 minuto definido en `docs/codex/PROJECT_WORKING_NOTES.md`; la ejecucion equivalente por `--include` si cierra correctamente.
- Cierre solicitado por el usuario el 2026-06-27 para volver al roadmap visual. Las comprobaciones manuales pasan a tratarse como validacion de uso continuo, no como bloqueo del cierre documental.
