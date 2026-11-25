# QA transversal

## Dirección

- Mantener una pirámide de pruebas ejecutable: unitarias y contratos, E2E determinista, integración real aislada y exploración visual y accesible.
- No usar producción para pruebas destructivas ni versionar credenciales.
- Convertir regresiones estables en automatización y reservar la exploración para estados visuales o dependencias externas.

## Deuda relevante

- La cobertura sigue siendo baja, con un suelo antirregresión de 28/21/23/30.
- Sin secretos, la automatización cubre superficies públicas, guards, accesibilidad, visual y smoke compacto; los recorridos amplios con sesión dependen del dataset QA y de las cuentas de prueba de la plataforma.

## Líneas activas

- La campaña real nocturna corre desde el servidor (`scripts/qa/nocturna-servidor.ps1`); falta registrar su tarea programada (`common/bugs.md`).
- Las campañas consumen `GET /qa/status` solo desde Node. La aceptación contractual 5/5 con el backend está cerrada y no se repite.
- La campaña real mantiene una lease con un supervisor que la renueva cada tres minutos; si una renovación falla, aborta la operación protegida y conserva el cleanup seguro.
- Hosting QA en `https://libros-qa.web.app`, con identidad WIF limitada y el Environment `qa` restringido a `main`.
