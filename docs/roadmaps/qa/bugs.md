# QA transversal - Bugs y mejoras acotadas

## Pendiente

Nada abierto.

## Finalizado

Lo cerrado del login nativo de Capacitor, el tiempo real propio (`realtime-recovery`, `/health/realtime`, NATS), la sesión propia y la administración se retiró con la adhesión; su historial está en Git.

- [x] Campaña local (1/10/2026): `scripts/qa/run-local-campaign.mjs` carga solo las variables QA permitidas, adapta `LIBROS_QA_RESET_TOKEN`, conserva la lease en memoria y la renueva, restaura y libera aunque falle el hijo. La entrada de CI exige `GITHUB_ENV` antes de adquirir.
- [x] Pruebas reales con historial (1/10/2026): el baseline conserva estados en los alias de colección, pero sin posesión (`MiColeccion.EnBiblioteca=false`) ni fechas de incorporación; la prueba prepara explícitamente la posesión y una reseña o puntuación antes de capturar el historial.
- [x] Fixtures de Playwright aisladas (1/10/2026): cada fixture crea su propia lista de errores esperados; compartirla entre pruebas de un worker contaminaba las siguientes con un 409 ajeno.
- [x] Superficies alojadas: por decisión del propietario, no se prueban en el Hosting de QA las superficies Mobile (el navegador usa siempre Web); Mobile se cubre con `*.mobile.spec` en local. La espera de imágenes ignora las portadas `loading="lazy"` fuera de pantalla, y el contexto compartido marca como vista la bienvenida «Elige tu estilo».
- [x] `npm run api:lint` sin errores ni avisos.
- [x] Migración mayor de Angular hecha por las migraciones oficiales, sin `npm audit fix --force` (que salta de framework y toolchain sin migrar ni revisar Material/CDK): `docs/roadmaps/common/ANGULAR_22_COMPATIBILITY.md`.
- [x] Karma headless en Windows y CI con un launcher que desactiva la GPU (`--disable-gpu`); termina por sí mismo, sin reporter HTML tardío ni contaminación global entre specs.
- [x] Semáforo `GET /qa/status` desde Node: el inicio exige `Status=ready` y `BeginCampaign=allowed`; la lease debe ser del llamante; keepalive, fixtures, reset y cleanup respetan sus capacidades cerradas y solo `retry` admite espera acotada. El token no llega al navegador.
- [x] Barrera y cleanup separados: antes de la campaña se exigen SQL saludable, `SourceDirty=false` y la misma revisión de API y gateway; una variación operativa posterior no impide restaurar `baseline`.
- [x] Configuración de Hosting QA (`firebase.qa.json`) generada en la raíz ignorada del checkout: Firebase resuelve el directorio público respecto al JSON y rechaza que salga del proyecto.
- [x] Workflows con `actions/checkout@v5`.
- [x] Presupuesto inicial de producción recuperado sin elevar el límite.
- [x] Suelo de cobertura global: 28 % statements, 21 % ramas, 23 % funciones y 30 % líneas.
