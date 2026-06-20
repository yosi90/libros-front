# Peticion al backend: actividad reciente del perfil

## Contexto

El frontend ha redisenado la pantalla de perfil para mostrar una cabecera de usuario, contadores de biblioteca, controles de seguridad y una seccion de actividad reciente.

Actualmente el frontend ya esta preparado para consumir un endpoint nuevo, pero si el backend aun no lo expone la seccion queda en estado vacio sin romper la pantalla.

## Que necesitamos del backend

Crear un endpoint autenticado:

```http
GET /biblioteca/actividad_reciente?limit=4
```

El endpoint debe devolver los ultimos libros y antologias cuya actividad relevante sea un cambio de estado de lectura. El parametro `limit` debe controlar el numero maximo de elementos devueltos; para el perfil el front usara `4`.

Respuesta esperada:

```json
[
  {
    "Tipo": "libro",
    "Id": 1,
    "Nombre": "Palabras radiantes",
    "Autores": [{ "Id": 1, "Nombre": "Brandon Sanderson" }],
    "Portada": "b_1_1.png",
    "Estado": {
      "Id": 3,
      "Nombre": "Leido",
      "Fecha": "2024-05-13T00:00:00.000Z"
    }
  }
]
```

Contrato TypeScript usado por el front:

```ts
interface RecentLibraryActivity {
  Tipo: 'libro' | 'antologia';
  Id: number;
  Nombre: string;
  Autores: { Id: number; Nombre: string }[];
  Portada: string;
  Estado: { Id: number; Nombre: string; Fecha: string };
}
```

## Por que lo necesitamos

El perfil ya no debe mostrar listados completos de libros, autores, universos, sagas o antologias. Esos flujos se van a mover a las pantallas de insercion/edicion.

En su lugar, el perfil necesita una senal breve y util de actividad: que libros o antologias se han movido recientemente en la biblioteca y con que estado quedaron.

## Que esperamos lograr

- Mostrar hasta cuatro cards de actividad reciente en el perfil.
- Enseñar portada, titulo, autores y estado actual del item.
- Permitir que el usuario abra el libro o antologia desde esa card.
- Evitar que el frontend tenga que reconstruir actividad mezclando stores locales y fechas de estado de forma parcial.

## Criterios esperados

- Requiere JWT, igual que el resto de endpoints privados de biblioteca.
- Ordenar por `Estado.Fecha` descendente.
- Mezclar libros y antologias en una unica lista.
- Devolver solo elementos visibles para el usuario autenticado.
- Si no hay actividad, devolver `[]`.
- Si `limit` no se envia, usar un valor por defecto razonable, preferiblemente `4`.

## Estado en frontend

El front ya tiene preparado:

- `RecentLibraryActivity` en `src/app/interfaces/user.ts`.
- `UserService.getRecentLibraryActivity(limit = 4)`.
- Consumo desde el perfil con fallback silencioso si el endpoint falla o aun no existe.

