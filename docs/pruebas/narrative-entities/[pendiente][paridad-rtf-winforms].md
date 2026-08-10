# Checklist manual - Paridad RTF con WinForms

- [ ] La escena 2297 no muestra saltos iniciales y conserva una sola linea vacia entre parrafos.
- [ ] Acentos, fuentes, tamanos, colores, resaltados y formatos inline coinciden con RichTextBox.
- [ ] Abrir y cerrar un editor sin modificarlo no genera un `PUT` ni cambia el RTF original.
- [ ] Editar texto y abandonar el control fuerza el autoguardado de la escena.
- [ ] Escribir mientras un guardado esta en curso conserva la segunda revision y envia otro `PUT`.
- [ ] Las keywords no admiten edicion parcial, pegado, arrastre ni formato directo.
- [ ] Backspace y Delete eliminan una keyword completa cuando corresponde.
- [ ] Las selecciones mixtas modifican texto normal sin alterar keywords.
- [ ] Copiar y deshacer/rehacer alrededor de keywords mantienen un resultado coherente.
- [ ] Las keywords se ven en `#F5DEB3`, subrayadas y navegables.
- [ ] El RTF generado en Firefox y Chrome se abre correctamente en WinForms.
- [ ] El RTF vuelto a guardar por WinForms conserva su estructura al reabrirse en la web.
- [ ] Escenas y entradas narrativas editables/readonly comparten el mismo comportamiento.

