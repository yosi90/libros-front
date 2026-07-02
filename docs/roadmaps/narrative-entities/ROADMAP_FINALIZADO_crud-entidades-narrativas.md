# CRUD Entidades Narrativas

## Objetivo

Completar una primera version viable para crear, editar, documentar con entradas, relacionar y quitar del libro personajes, localizaciones, conceptos, organizaciones, eventos y citas desde la vista de libro.

## Checklist

- [x] **Descripcion:** Crear la peticion backend para endpoints de edicion y desasociacion de entidades narrativas.
  **Por que se necesita:** El frontend no puede completar CRUD real si la API solo permite altas o relaciones parciales.
  **Que se espera lograr:** Dejar un contrato owner-only claro para `PATCH` y `DELETE` por contexto de libro.
  **Peligros si se mantiene como estaba:** La UI podria mostrar acciones que siempre fallan contra el backend actual.
  **Peligros del cambio:** Anticipar endpoints obliga a mantener el contrato sincronizado cuando backend responda.

- [x] **Descripcion:** Ampliar servicios e interfaces frontend para escrituras de entidad raiz y desasociacion.
  **Por que se necesita:** El gestor necesita metodos tipados para guardar nombre, campos especificos y quitar entidades del libro actual.
  **Que se espera lograr:** Encapsular URLs y payloads nuevos sin duplicar llamadas HTTP en componentes.
  **Peligros si se mantiene como estaba:** Los componentes quedarian acoplados a rutas manuales y payloads inconsistentes.
  **Peligros del cambio:** Si el backend cambia nombres de ruta, habra que ajustar la capa de servicio.

- [x] **Descripcion:** Consolidar el gestor unificado de entidades narrativas.
  **Por que se necesita:** Localizaciones, conceptos, organizaciones, eventos y citas comparten patron de listado, alta, edicion, entradas y refresco de libro.
  **Que se espera lograr:** Mantener una pantalla densa y coherente con acciones de alta, edicion, entradas, relaciones y desasociacion.
  **Peligros si se mantiene como estaba:** El usuario tendria altas basicas pero no mantenimiento viable de entidades.
  **Peligros del cambio:** Un formulario demasiado generico puede ocultar validaciones especificas por entidad.

- [x] **Descripcion:** Completar la pantalla de personajes con entradas y desasociacion.
  **Por que se necesita:** Personajes ya gestiona apodos, estados y relaciones, pero no permite editar entradas ni quitarlo del libro.
  **Que se espera lograr:** Cubrir el mismo nivel de mantenimiento narrativo que el resto de entidades.
  **Peligros si se mantiene como estaba:** Personajes seguiria siendo una excepcion incompleta dentro del CRUD narrativo.
  **Peligros del cambio:** Tocar una pantalla con logica contextual de apodos puede confundir cambio narrativo con correccion.

- [x] **Descripcion:** Verificar servicios, validaciones y build.
  **Por que se necesita:** El cambio anade contratos HTTP previstos y formularios condicionales.
  **Que se espera lograr:** Confirmar que URLs/payloads son estables y que Angular compila.
  **Peligros si se mantiene como estaba:** Las regresiones quedarian ocultas hasta probar manualmente contra API.
  **Peligros del cambio:** Los tests pueden requerir ajuste si el contrato backend final difiere.

## Notas de cierre

- Peticion backend creada en `docs/codex/peticiones/crud-entidades-narrativas.md`.
- Frontend implementado contra el contrato previsto; hasta que backend exista, las acciones nuevas de `PATCH` y desasociacion recibiran error real de API.
- `npm run build` verificado correctamente.
- `npx ng test --watch=false --browsers=ChromeHeadless` verificado correctamente con 34 specs en verde.
