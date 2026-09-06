# Peticiones al backend

Esta carpeta contiene las peticiones que el frontend dirige al backend.

## Convencion

- Las peticiones pendientes viven directamente en `docs/peticiones/` sin prefijo de estado.
- Cuando backend responde, el frontend debe revisitar la peticion, contrastarla con la documentacion recibida y moverla a `docs/peticiones/respondidas/`.
- Toda peticion respondida debe incluir una seccion `Estado de respuesta` y usar uno de estos prefijos:
  - `ACEPTADA_`: backend cubre la necesidad funcional solicitada, aunque cambie detalles de implementacion.
  - `ACEPTADA-PARCIALMENTE_`: backend cubre solo parte de la necesidad; el documento debe enumerar lo que queda pendiente.
  - `RECHAZADA_`: backend descarta la necesidad o el contrato vigente no ofrece la capacidad solicitada; el documento debe explicar la consecuencia.
- Si backend revisa una decision, se vuelve a evaluar el documento, se actualiza su estado y se renombra si corresponde.

Cada nueva peticion debe explicar que se necesita, por que se necesita y que se espera lograr.
