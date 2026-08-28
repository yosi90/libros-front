# Smokes manuales Android QA

Esta guía coordina las dos pruebas físicas que requieren secretos o infraestructura custodiados por backend: login password Firebase y entrega FCM real. No crea endpoints públicos, no usa producción y no expone contraseñas ni tokens FCM.

## Cuenta acordada

Se usa `user.member-a`, cuenta técnica verificada y exclusiva de QA. Conserva la credencial estable ya sincronizada entre Firebase QA, `qa/.env` y los secrets CI. No se rota para este smoke porque hacerlo afectaría al fixture compartido y obligaría a coordinar cuatro superficies sin aportar aislamiento adicional; la credencial nunca sale del PC del propietario ni se envía por chat.

## Smoke de contraseña

En el servidor QA, con la APK preparada en la pantalla de login:

```powershell
.\qa\copy-user-password-for-manual-smoke.ps1 -UserAlias user.member-a
```

La utilidad valida primero la credencial contra Firebase `libros-qa`, la copia al portapapeles local sin imprimirla y espera. Pegarla directamente en la APK y pulsar Enter en la consola para limpiar el portapapeles. No copiarla a documentos, mensajes, capturas o gestores de logs.

El front debe confirmar de forma sanitizada que el login llega a `user.member-a`, intercambia `/auth/session`, obtiene el UID canónico `libros:900003` y restaura cookie/CSRF. No debe comunicar JWT, cookies ni direcciones completas.

## Smoke FCM real

1. Iniciar sesión como `user.member-a` en la APK, habilitar push para `chat` y registrar el dispositivo Android.
2. Dejar la APK ya en segundo plano y avisar al operador únicamente de que el dispositivo está listo; no enviar el token. Un mensaje recibido mientras la APK está en foreground no vuelve a mostrarse al minimizarla.
3. En el servidor QA ejecutar:

```powershell
.\qa\send-manual-android-push.ps1 -UserAlias user.member-a -Category chat
```

El wrapper exige una release QA limpia, adquiere una lease `manual` y llama a la utilidad interna. Esta resuelve el último dispositivo Android activo, comprueba que `chat/push` está habilitado y envía con prioridad Android alta mediante Firebase Admin al proyecto exacto `libros-qa`. El mensaje visible es `Prueba QA de notificaciones` / `Entrega manual Android QA`; no crea una notificación de negocio ni usa `notificationId`. La salida solo contiene entorno, proyecto, categoría y conteos agregados.

El front confirma recepción en foreground o segundo plano sin compartir token, message ID, JWT ni datos de identidad. Que FCM acepte el mensaje acredita solo su admisión para entrega, no que haya llegado al terminal; la observación física acredita la entrega final.

## Limpieza

Después de la confirmación —o tras cualquier fallo que haya ocurrido después del registro del dispositivo— ejecutar:

```powershell
.\qa\reset-baseline-after-manual-smoke.ps1
```

La utilidad adquiere su propia lease, restaura el escenario `baseline` y la libera. Después, `GET /qa/status` debe mostrar `Scenario.Active=baseline` y `Lease.Active=false`.

## Límites de seguridad

- Ejecutar solo desde este host, con `qa/.env`; nunca pasar secretos como argumentos.
- No usar Firebase Console para copiar tokens ni crear campañas manuales.
- No ejecutar estos scripts desde CI: requieren coordinación física con el propietario.
- No actualizar variables o secrets de GitHub para este recorrido.
- Ninguna utilidad acepta proyecto, base, token, título o cuerpo arbitrarios.
