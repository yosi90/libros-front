# Pruebas Pendientes - Paridad App De Escritorio

> Fase de implementacion finalizada. Las comprobaciones manuales no bloquean el inicio del redisenio visual y quedan como registro historico pendiente de validacion con datos reales.

## Verificaciones automaticas

- [x] `npm run build`

## Verificaciones manuales

- [ ] Abrir un libro autoconclusivo y comprobar que carga sin errores.
- [ ] Abrir un libro de saga y comprobar que las entidades heredadas no se presentan como creadas en el libro actual.
- [ ] Confirmar que los ordenes decimales de saga no se truncan.
- [ ] Confirmar que personajes muestran nombre contextual y, si llega en la respuesta, procedencia y metricas.
- [ ] Confirmar que escenas distinguen personajes presentes de personajes solo nombrados.
- [ ] Confirmar que las listas narrativas no-personaje muestran entidades actuales y heredadas del libro abierto.
- [ ] Confirmar que las altas de localizaciones, conceptos, organizaciones, eventos y citas envian `Entradas` validas y refrescan el libro.
- [ ] Confirmar que las estadisticas de libro normalizan datos nuevos de API y soportan libros sin metricas completas.
- [ ] Confirmar que las graficas de libro son legibles en libros con pocos y muchos capitulos/personajes.
- [ ] Confirmar que las estadisticas de universo/globales conservan los datos actuales tras el redisenio visual.
- [ ] Confirmar que las estadisticas de universo/globales no solapan texto ni graficas en desktop y movil.
- [ ] Confirmar que no se ofrecen borrados de entidades narrativas completas sin contrato explicito.
- [ ] Confirmar que el flujo de password reset no revela si el email existe.
