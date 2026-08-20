# Decisión técnica: CSS y animación del sistema responsive

## Estado

Aceptada el 20 de agosto de 2026 para el Hito 2 del roadmap responsive.

## Decisión

No incorporar Tailwind ni una librería externa de animación durante la construcción de los temas y shells responsive. La base nueva usa:

- Sass y CSS nativo;
- custom properties semánticas;
- `AdaptiveLayoutService` y Angular CDK `BreakpointObserver`;
- container queries para adaptación local;
- Angular Material/CDK para overlays, drawers y accesibilidad;
- transiciones CSS o Web Animations para movimientos acotados.

Bootstrap permanece congelado como legado. Las primitives nuevas no importan ni reutilizan clases, utilidades o mixins Bootstrap.

El Sass se reutiliza de forma deliberada, no restrictiva. Los patrones repetidos o con varios consumidores inmediatos se extraen a tokens, funciones, mixins o primitives; una necesidad singular puede permanecer local hasta demostrar una abstracción estable. Ninguna pantalla debe perder una composición adecuada únicamente para encajar en una solución compartida anterior.

Los parciales compartidos contienen preferentemente herramientas que no emiten CSS por sí solas. Las reglas globales se publican una vez y las geometrías lazy se incluyen donde realmente se usan, evitando pagar en el bundle inicial por futuros consumidores.

El Hito 3 concreta esta decisión para Angular Material 19: se usa su theming M3 por variables de sistema, con una única emisión de estructura/tipografía/densidad y color por tema. Se retiró el prebuilt `deeppurple-amber`; generar tres bundles completos de componentes se descartó al medir un exceso de 43,80 KB sobre el budget, mientras la variante por variables deja el inicial en 1,95 MB.

## Motivos

- El proyecto ya compila Sass y usa Material/CDK; no hace falta otro pipeline para construir los shells previstos.
- Tailwind conviviría con abundante Sass legacy, Material MDC y los futuros tokens, creando tres fuentes de especificidad antes de demostrar una reducción real.
- Los movimientos previstos son transiciones de rail, drawer, modal, panel y cambio de tema; CSS y CDK cubren estos casos respetando `prefers-reduced-motion`.
- Evitar otra dependencia protege el bundle inicial y reduce migraciones futuras.
- Esta estrategia permite reducir Sass duplicado sin convertir una primitive existente en un componente universal lleno de excepciones.

## Condiciones para reabrirla

Una propuesta futura debe aportar un caso no resuelto limpiamente por la base actual y comparar, como mínimo:

- CSS y código eliminados frente a los añadidos;
- tamaño inicial y lazy tras tree-shaking;
- integración con tokens y overlays Material;
- accesibilidad, foco y `prefers-reduced-motion`;
- coste de migración y convivencia con el legado;
- mantenimiento y estabilidad de la dependencia.

No se elevan budgets para aceptar la librería antes de esa evaluación.
