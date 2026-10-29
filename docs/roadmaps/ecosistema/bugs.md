# Ecosistema - Bugs y mejoras acotadas

## Pendiente

- Ninguno registrado.

## En curso

- Ninguno registrado.

## Finalizado

- [x] 29/10/2026: con las normas de la plataforma pendientes, la APK enseñaba un aviso de error además del aviso de las normas (la web no). Causa: `MensajesDeError.esBloqueoPorNormas` solo reconocía `usage_policy_acceptance_required` y `creation_policy_acceptance_required`, que ya no emite nadie; la API responde `platform_rules_acceptance_required`. Corrección: reconoce ese código, como `isPolicyAcceptanceBlock` de la web. Detectado al limpiar los textos de error repetidos (duplicados de la APK, 12). Verificación: `RedYPortadasTest` con el código actual.

- [x] 2026-10-24: al traer el repositorio desde el PC personal, 981 archivos de la raíz (`src/`, `public/`, `scripts/`, `qa/`, `angular.json`, `package.json`, `AGENTS.md`…) habían quedado dentro de `docs/`. Comprobados idénticos a `HEAD` uno a uno y devueltos a la raíz; árbol limpio respecto a `origin/main`.
