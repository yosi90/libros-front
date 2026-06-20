# Standalone: sistema de búsqueda y filtros para colección de cartas

Este directorio es autocontenido. Puedes copiarlo fuera de este repositorio y dárselo al Codex de otro proyecto sin perder contexto.

Describe y proporciona una implementación portable de un buscador de colección de cartas con:

- chips dentro del textbox;
- chips textuales con alcance, por ejemplo `contiene`, `nombre`, `tipo`, `texto`, `característica`;
- menú flotante de sugerencias al escribir;
- botón de limpiar todo;
- filtros rápidos siempre visibles;
- menú flotante de filtros avanzados;
- menú flotante de ordenación con prioridades;
- filtros externos de disponibilidad, por ejemplo `Todas`, `Solo mías`, `Wants` o `Deck`;
- modo de vista `Imagen` / `Texto`;
- lógica pura para búsqueda, filtrado y ordenación.

La documentación no presupone Lorcana, React específico del proyecto original ni rutas internas. Usa nombres genéricos de cartas para que otra app pueda reemplazar colores, tipos, rarezas, sets y disponibilidad por sus propios filtros.

## Cómo usar este paquete en otro proyecto

1. Copia este directorio completo.
2. Lee primero `system-spec.md`.
3. Copia o adapta los archivos de `portable-code/`.
4. Sustituye `SearchableCard` por el modelo real de tu app.
5. Sustituye `CardSearchFilters` y `CardSearchFilterOptions` por tus filtros reales.
6. Añade tests parecidos a los ejemplos de `testing-guide.md`.

## Contenido

- `system-spec.md`: explicación completa de UX, estados y flujo de datos.
- `porting-guide.md`: pasos concretos para integrarlo en otra app.
- `testing-guide.md`: casos de prueba recomendados.
- `portable-code/searchTypes.ts`: contratos TypeScript.
- `portable-code/filterEngine.ts`: búsqueda textual, filtros y ordenación.
- `portable-code/SearchFilterBar.tsx`: textbox con chips, sugerencias y menús flotantes.
- `portable-code/SearchControls.tsx`: envoltorio con disponibilidad, vista y filtros especiales.
- `portable-code/searchStyles.css`: estilos mínimos para que el sistema funcione bien en móvil.

## Resumen corto para Codex

El sistema separa el estado en:

```ts
const [query, setQuery] = useState('')
const [filters, setFilters] = useState<CardSearchFilters>({})
const [sort, setSort] = useState<CardSortOption>(defaultSort)
```

`query` contiene chips textuales serializados por líneas:

```txt
name:mickey
text:draw card
```

`filters` contiene filtros estructurados:

```ts
{
  colors: ['Ruby', 'Amber'],
  costs: [2, 3],
  types: ['Character'],
  inkwell: true,
}
```

La UI nunca hace fetch directamente. La página contenedora escucha cambios de estado, carga datos con debounce y aplica:

1. búsqueda textual;
2. filtros estructurados;
3. filtros externos de disponibilidad;
4. ordenación;
5. renderizado.

