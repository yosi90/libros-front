# Petición al Codex de Notificapp: tema efectivo para paneles de plugin

El plugin de Libros se dibuja dentro de `PluginPanel.kt`. El panel HTML ya usa `prefers-color-scheme` como respaldo, pero Notificapp permite elegir manualmente `system`, `light` o `dark`; una selección manual no llega al WebView, así que el panel puede tener un tema distinto al resto de la APK.

## Cambio pedido

- Exponer en el puente JavaScript de `PluginPanel` un método de solo lectura `Notificapp.getTheme()` que devuelva **`"light"` o `"dark"`**, el tema efectivo que la APK ya calcula para `MaterialTheme`. Si la preferencia es `system`, resolverla con el estado actual del sistema.
- Pasar ese tema efectivo al `PluginPanel` desde `MainActivity`, sin incluir credenciales, datos de usuario ni nuevos permisos en el manifiesto del plugin.
- Al reabrir el panel tras cambiar la preferencia, el método debe devolver el valor nuevo. Si la APK permite cambiar el tema con el panel aún abierto en el futuro, actualizar también el documento HTML o emitir un evento para evitar que los colores queden desfasados.
- Mantener `getLaunchEvent()` y `request()` con su contrato actual.

El HTML de Libros llama a `getTheme()` cuando está disponible y fija `data-theme="light|dark"` en la raíz. En versiones anteriores de la APK sigue el tema del sistema con CSS. Una prueba útil es usar el sistema claro con Notificapp forzada a oscuro, abrir un aviso de Libros y comprobar que barra, panel y controles son oscuros; repetir con el sistema oscuro y Notificapp forzada a claro.
