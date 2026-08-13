# Checklist finalizada - Paridad RTF mediante RichEdit

- [x] El harness carga RTF mediante `System.Windows.Forms.RichTextBox.Rtf` sin referenciar ni iniciar la aplicacion WinForms.
- [x] El lector del corpus aborta fuera de `YOSI-PC/libros`, ejecuta solo los `SELECT` fijos y no conserva textos en informes.
- [x] La escena 2297 no muestra saltos iniciales y conserva una sola linea vacia entre parrafos.
- [x] Acentos, fuentes, tamanos, colores, resaltados y formatos inline coinciden con RichTextBox.
- [x] Abrir y cerrar un editor sin modificarlo no genera un `PUT` ni cambia el RTF original.
- [x] Editar texto y abandonar el control fuerza el autoguardado de la escena.
- [x] Escribir mientras un guardado esta en curso conserva la segunda revision y envia otro `PUT`.
- [x] Las keywords no admiten edicion parcial, pegado, arrastre ni formato directo.
- [x] Backspace y Delete eliminan una keyword completa cuando corresponde.
- [x] Las selecciones mixtas modifican texto normal sin alterar keywords.
- [x] Copiar y deshacer/rehacer alrededor de keywords mantienen un resultado coherente.
- [x] Las keywords se ven en `#F5DEB3`, subrayadas y navegables.
- [x] El RTF generado en Firefox y Chrome produce en RichEdit el mismo documento esperado.
- [x] Los 952 RTF de escenas y 365 de entradas sobreviven RichEdit -> web -> RichEdit en ambos navegadores.
- [x] Escenas y entradas narrativas editables/readonly comparten el mismo conversor.
- [x] El informe del corpus contiene solo totales, ids, hashes y categorias de diferencia, nunca textos.
- [x] El workflow Windows manual ejecuta los mismos fixtures sinteticos validados localmente en Windows, sin secretos, backend ni despliegues.
