# Referencias humanas y centro de acceso a clubes

> Estado: finalizado. La implementación y sus contratos backend están integrados y verificados; la checklist visual queda disponible para QA manual.

## Objetivo

Construir una bandeja completa de solicitudes e invitaciones de clubes y eliminar de la interfaz la necesidad de conocer identificadores técnicos. Los IDs seguirán siendo claves internas válidas para modelos, rutas y peticiones, pero toda selección y referencia visible se resolverá mediante nombres, títulos, avatares, catálogos o contexto comprensible.

- [x] **1. Alinear documentación y contratos disponibles.**
  - **Descripcion:** clasificar la respuesta de bandejas de clubes, tipar sus modelos y registrar las carencias de referencias humanas que todavía requieren backend.
  - **Por que se necesita:** la API ya amplía solicitudes e invitaciones, pero el cliente usa el contrato anterior y todavía existen flujos que obligan a introducir IDs.
  - **Que se espera lograr:** documentación coherente, clientes discriminados y peticiones concretas únicamente donde falten resolutores humanos.
  - **Peligros si se mantiene como estaba:** llamadas inválidas por faltar `direccion`, bandejas invisibles y formularios imposibles de usar sin conocimiento técnico.
  - **Peligros del cambio:** mezclar variantes enviadas y recibidas o pedir al backend que elimine IDs legítimos de sus contratos internos.
  - [x] Archivar como aceptada la petición de bandejas propias.
  - [x] Abrir peticiones para candidatos de invitación, autores de debates e identidad en alegaciones.
  - [x] Añadir la regla de referencias humanas a la guía visual.

- [x] **2. Crear el centro de Acceso de Clubes.**
  - **Descripcion:** añadir una sección independiente para solicitudes e invitaciones, direcciones, estados, paginación, contadores y acciones.
  - **Por que se necesita:** quien solicita, invita o modera no dispone de un historial central ni puede cancelar o resolver todos los pendientes desde la portada de Clubes.
  - **Que se espera lograr:** una bandeja REST completa, enlazable y reconciliada con realtime.
  - **Peligros si se mantiene como estaba:** pendientes perdidos, invitaciones duplicadas en Descubrir y estados sin seguimiento.
  - **Peligros del cambio:** presentar acciones para registros resueltos, perder filas ante una cancelación incierta o desincronizar contadores y membresías.
  - [x] Tipar contadores y las cuatro variantes de bandeja.
  - [x] Añadir `Acceso`, filtros, deep links, estados vacíos y paginación.
  - [x] Implementar aceptar, rechazar y cancelar con reconciliación REST.
  - [x] Mover las invitaciones fuera de Descubrir y refrescar con `club.updated`.
  - [x] Añadir mensaje opcional al solicitar acceso a un club cerrado.

- [x] **3. Sustituir identificadores editables por selectores humanos.**
  - **Descripcion:** resolver internamente IDs a partir de entidades seleccionadas por nombre o contexto en Comunidad, Clubes, narrativa y Administración.
  - **Por que se necesita:** un identificador interno no es lenguaje de producto ni un dato que una persona deba descubrir o copiar.
  - **Que se espera lograr:** formularios autosuficientes que continúan enviando los contratos REST actuales.
  - **Peligros si se mantiene como estaba:** errores de referencia, exposición de detalles técnicos y acciones sobre entidades equivocadas.
  - **Peligros del cambio:** ofrecer catálogos incompletos, conservar una selección obsoleta o resolver un nombre ambiguo al ID incorrecto.
  - [x] Sustituir vínculos sociales y objetivos de lectura por selectores nominales.
  - [x] Sustituir estados narrativos por sus catálogos.
  - [x] Sustituir selección administrativa de usuario por búsqueda.
  - [x] Incorporar los resolutores pendientes cuando backend responda.

- [x] **4. Retirar IDs de copy, listados y fallbacks.**
  - **Descripcion:** eliminar números de usuarios, libros, peticiones, reportes, entidades y fallbacks visibles, conservándolos solo como claves internas.
  - **Por que se necesita:** ocultar el input no basta si las cards y mensajes siguen enseñando referencias como `#123`.
  - **Que se espera lograr:** nombres, fechas, tipos y estados como referencias de producto en todos los roles.
  - **Peligros si se mantiene como estaba:** la interfaz continúa enseñando una abstracción que el usuario no puede interpretar.
  - **Peligros del cambio:** perder contexto operativo si se retira un número sin ofrecer una referencia humana equivalente.
  - [x] Auditar templates y fallbacks de toda la aplicación.
  - [x] Mantener IDs únicamente en bindings, rutas y payloads no visibles.

- [x] **5. Verificar y cerrar o pausar la iniciativa.**
  - **Descripcion:** ejecutar pruebas automáticas y QA manual; cerrar si no quedan dependencias o pausar formalmente si solo faltan contratos backend.
  - **Por que se necesita:** el cambio atraviesa roles, navegación, formularios y contratos discriminados.
  - **Que se espera lograr:** comportamiento estable y una deuda residual explícita, nunca un roadmap aparentemente completo.
  - **Peligros si se mantiene como estaba:** regresiones silenciosas de permisos, paginación o selección.
  - **Peligros del cambio:** cerrar con falsos positivos de la auditoría o bloquear indefinidamente trabajo ya verificable.
  - [x] Compilar specs, ejecutar build y Karma con límite de un minuto.
  - [ ] Completar la checklist manual asociada.
  - [x] Renombrar roadmap/checklist a finalizado o pausado según dependencias reales.

## Contratos externos resueltos

Backend entregó y frontend consume:

- `GET /clubes-lectura/{id}/invitaciones/candidatos`: buscador paginado de personas elegibles para invitar.
- `Autor { Id, Nombre, Imagen }` en debates y comentarios de club.
- `Usuario { Id, Nombre, Email }` en la cola administrativa de alegaciones.

Las peticiones correspondientes están archivadas como aceptadas en `docs/peticiones/respondidas/`.

## Verificación automática

- `npx tsc -p tsconfig.spec.json --noEmit`: correcto.
- `npm run build`: correcto; conserva únicamente los avisos CSS históricos del bundle.
- Karma ChromeHeadless: `167 SUCCESS`.
