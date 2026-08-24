# Visto bueno final del smoke productivo de autenticación Firebase

## Decisión

Frontend y el propietario dan por aceptado el Hito 13 y el smoke productivo posterior al corte Firebase. Puede ejecutarse la retirada irreversible de las credenciales SQL legacy conforme al paso 7 de `docs/backend/desarrollo/CORTE_AUTENTICACION_PRODUCCION.md`, manteniendo sus guardas, backup verificado y comprobaciones posteriores.

## Releases comprobadas

- Backend productivo documentado: `315ae4b06aa7aadab96dccba2972bb6306207157`.
- Frontend con confirmación Google para correo distinto: `4537a11ba8c23b49e306ec1e73c0acff68938955`.
- Despliegue de esa entrega: GitHub Actions `32759751532`, verde.
- Frontend con acceso visible a Cuenta y seguridad: `0b168e8774b038873145f4a7fb9b1800dfaaf0f3`.
- Despliegue final comprobado: GitHub Actions `32760762656`, verde.

## Evidencia funcional aceptada

El propietario confirmó manualmente en producción, sin compartir credenciales, tokens ni direcciones completas:

1. acceso con la cuenta existente mediante contraseña;
2. aceptación de las normas de uso y regreso correcto a la biblioteca;
3. reautenticación desde Cuenta y seguridad;
4. elección de una identidad Google cuyo correo verificado difiere del correo principal;
5. presentación de la confirmación explícita con ambas direcciones enmascaradas;
6. vinculación correcta sin cambiar el correo principal;
7. cierre de sesión y acceso mediante Google a la misma cuenta SQL;
8. conservación de usuario, biblioteca, datos y preferencias;
9. recarga y restauración correctas de la sesión;
10. disponibilidad de un acceso navegable a `/dashboard/account-security` en la web desplegada.

La campaña automatizada del corte, el OAuth real QA y los controles de teléfono ficticio quedaron acreditados previamente en `docs/peticiones/respondidas/ACEPTADA_autorizar-corte-productivo-autenticacion-firebase.md`.

## Acción solicitada

1. Ejecutar el script post-corte que elimina `password_reset_tokens`, `email_verification_tokens` y `usuarios.password` solo si sus guardas confirman identidades password Firebase activas para todas las cuentas aplicables.
2. Verificar después password, Google vinculado, refresh/CSRF, cuenta SQL, preferencias y ausencia de rutas legacy.
3. Conservar y gestionar el backup conforme al periodo operativo acordado, sin incorporar datos sensibles a la respuesta.
4. Documentar release, resultado sanitizado y comprobaciones finales; mover esta petición a `respondidas` cuando termine.

El descontento visual con los temas light/dark no afecta esta aceptación funcional y se tratará en una iniciativa integral de estilos posterior al roadmap actual.
