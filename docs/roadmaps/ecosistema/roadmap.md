# Ecosistema Yosiftware

## Dirección

- Libros se adscribe a la plataforma común de `*.yosiftware.es`. La cuenta, la sesión, el perfil, las relaciones, el chat, las notificaciones, la moderación de cuentas y los errores y propuestas son de la plataforma. Libros conserva su dominio: catálogo, colección, ediciones, libros, entidades narrativas, estadísticas, clubes (la pertenencia, en los espacios) y peticiones de catálogo.
- El kit vigente vive en `ecosistema-kit/` (ignorado por Git) y se actualiza siempre al más reciente. El bloque de la plataforma está en `AGENTS.md`.
- La APK pasa de Capacitor (`android/`) a nativa en Kotlin (`android-nativa/`): primero un clon exacto, adherido desde el principio; después, las mejoras.

## Congelación (vigente hasta el corte)

- 2026-10-07, petición de la plataforma: no añadir funciones nuevas al inicio de sesión y las cuentas, el perfil y los ajustes, las amistades, los seguimientos y los bloqueos, el chat, las notificaciones y el push, la moderación de cuentas ni las normas. Corregir errores y mantener lo que hay sí está permitido. No se borran ni transforman sus datos.
- 2026-10-09, aclaración: las peticiones propias (las de catálogo) ya no están congeladas. Los errores y las propuestas de mejora sí, hasta la migración, que los lleva a `<yosi-reportar>`.

## Líneas activas

- `ROADMAP_ACTIVO_adhesion-yosiftware-y-apk-kotlin.md`: adhesión de la web y APK Kotlin. Maestro y backend en `../Libros API/docs/roadmaps/ACTIVO_adhesion-yosiftware/`.

## Líneas pausadas

- `ROADMAP_PAUSADO_duplicados-apk-kotlin.md`: lo que la auditoría de duplicados de la APK (hito 14) dejó como propuesta.

## Referencias útiles

- Peticiones de la plataforma a Libros: `../Libros API/docs/peticiones/` (el frontend las recibe a través del propietario).
- Guías del kit: `ecosistema-kit/MIGRACION.md`, `ACCESO.md`, `APK.md`, `CAMBIO_DE_CUENTA.md`, `LISTA_DE_COMPROBACION.md`.
- Precedentes de APK nativa del ecosistema: `C:\Users\Yosi\Desktop\mazos lorcana\android` (Yosircana, sustituyó a su APK de Capacitor) y `C:\Users\Yosi\Desktop\Fichas 3.5\companion` (3.5 Companion).
