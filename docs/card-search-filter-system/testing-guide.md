# Guía de pruebas

## Motor de filtros

Prueba filtros AND:

```ts
expect(applyCardFilters([rubyCard], { colors: ['Ruby'] })).toEqual([rubyCard])
expect(applyCardFilters([rubyCard], { colors: ['Ruby', 'Amber'] })).toEqual([])
expect(applyCardFilters([dualColorCard], { colors: ['Ruby', 'Amber'] })).toEqual([
  dualColorCard,
])
```

Prueba filtros OR:

```ts
expect(applyCardFilters(cards, { costs: [2, 3] })).toEqual(cardsWithCost2Or3)
expect(applyCardFilters(cards, { types: ['Character', 'Item'] })).toEqual(charactersAndItems)
```

Prueba booleanos:

```ts
expect(applyCardFilters(cards, { inkwell: true })).toEqual(inkwellCards)
expect(applyCardFilters(cards, { inkwell: false })).toEqual(nonInkwellCards)
```

## Búsqueda textual

Prueba chip sin alcance:

```ts
expect(applyCardSearchQuery(cards, 'mickey')).toEqual(cardsContainingMickey)
```

Prueba chips con alcance:

```ts
expect(applyCardSearchQuery(cards, 'name:mickey')).toEqual(mickeyNameCards)
expect(applyCardSearchQuery(cards, 'text:draw')).toEqual(cardsWithDrawInText)
```

Prueba varios chips acumulativos:

```ts
expect(applyCardSearchQuery(cards, 'name:mickey\ntext:shift')).toEqual([mickeyWithShift])
```

## UI

Casos manuales recomendados:

- escribir texto y pulsar Enter crea chip;
- escribir texto y tocar `nombre:` crea chip con prefijo;
- seleccionar sugerencia cierra teclado móvil;
- blur del input no duplica chip tras seleccionar sugerencia;
- botón `x` de un chip borra solo ese chip;
- botón de limpiar todo borra chips textuales y filtros estructurados;
- abrir orden cierra filtros avanzados;
- abrir filtros avanzados cierra orden;
- tocar fuera cierra paneles;
- Escape cierra paneles;
- varios chips no desbordan el textbox en móvil.

## Orden

Prueba:

- orden alfabético ascendente y descendente;
- orden por número/grupo;
- orden por coste;
- varias prioridades;
- quitar una prioridad activa;
- no permitir cero prioridades activas.

