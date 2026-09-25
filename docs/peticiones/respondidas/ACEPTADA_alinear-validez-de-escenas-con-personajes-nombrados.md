# Alinear la validez de escenas con personajes nombrados

## Estado de respuesta

ACEPTADA. `ENDPOINTS.md` y `SceneWrite` en OpenAPI establecen que una escena válida requiere al menos un personaje asignado, presente o solo nombrado; una lista vacía sigue siendo inválida. El frontend ya aplicaba esa regla en `ChapterComponent.hasAssignedCharacter`, así que no requiere cambios.


## Qué se necesita

Modificar la validación de escritura de escenas para que el requisito de personajes se cumpla cuando exista al menos una asignación, con independencia de si `Nombrado` es `false` (presente) o `true` (solo nombrado).

Una escena válida debe tener nombre, descripción, localización y al menos un personaje presente o nombrado. La excepción de una escena sin personajes solo existe en frontend mientras se crea un capítulo nuevo: se considera aceptable para poder guardar el capítulo, pero no se envía como escena y no permite añadir otra.

## Por qué se necesita

El contrato actual documenta y aplica que debe existir al menos un personaje con `Nombrado = false`. Esto impide registrar escenas en las que un personaje únicamente es mencionado, aunque esa mención forma parte del modelo narrativo y debe bastar para completar la escena.

## Qué se espera lograr

- `POST` y `PUT` de escenas aceptan una lista no vacía compuesta solo por personajes con `Nombrado = true`.
- Una lista vacía continúa siendo inválida.
- La documentación de endpoints, OpenAPI, errores y pruebas refleja la misma regla.
- El frontend puede usar una única definición de «escena válida» para guardar y para habilitar «Nueva escena».

## Criterios de aceptación

1. Una escena completa con un personaje nombrado se crea y actualiza correctamente.
2. La misma escena sin ningún personaje se rechaza.
3. Se conserva `Nombrado` en lectura y escritura sin convertir una mención en presencia.
