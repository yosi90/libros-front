# Guia Para Portar El Sistema De Ventanas Flotantes

## Objetivo

Esta guia documenta el shell reutilizable de ventanas flotantes de Fichas 3.5. El componente aporta geometria, movimiento, resize, foco, minimizar, maximizar, cerrar, persistencia opcional y una variante de burbuja. El contenido funcional se proyecta con `ng-content`.

El componente actual se llama `VentanaDetalleFlotanteComponent` y vive historicamente bajo `nuevo-personaje`, pero ya lo consume el chat. En una web nueva debe ubicarse desde el principio en `shared/floating-window`; su comportamiento no pertenece a la creacion de personajes.

Esta guia no incluye la logica de chat. La feature concreta se documenta en `GUIA_PORTAR_VENTANA_FLOTANTE_CHAT.md`.

## Archivos De Referencia

- `src/app/components/nuevo-personaje/ventana-detalle-flotante/ventana-detalle-flotante.component.ts`
- `src/app/components/nuevo-personaje/ventana-detalle-flotante/ventana-detalle-flotante.component.html`
- `src/app/components/nuevo-personaje/ventana-detalle-flotante/ventana-detalle-flotante.component.sass`
- `src/app/components/nuevo-personaje/ventana-detalle-flotante/ventana-detalle-flotante.component.spec.ts`
- `src/app/interfaces/user-settings.ts`
- `src/app/services/user-settings.service.ts`

## Alcance De Escritorio

Las ventanas y burbujas flotantes son una capacidad exclusiva de escritorio en Fichas 3.5. La raiz solo monta su host si:

```ts
width > 1250 && height > 700 && height < width
```

La otra web puede elegir otro breakpoint, pero no debe montar un sistema draggable de escritorio en movil sin diseñar una interaccion tactil especifica. Debe existir una superficie tradicional alternativa.

## Contratos De Geometria

```ts
export interface FloatingWindowPlacementMinimized {
    version: 1;
    side: 'left' | 'right';
    top: number;
    updatedAt: number;
}

export interface FloatingWindowPlacementRestored {
    version: 1;
    left: number;
    top: number;
    width: number;
    height: number;
    updatedAt: number;
}

export type FloatingWindowVisualMode = 'window' | 'minimized' | 'maximized';
```

`restoredPlacement` guarda la geometria util de la ventana normal. `minimizedPlacement` guarda solo lateral y altura cuando la minimizada se ancla al viewport.

Versionar los shapes desde el primer dia permite migrarlos si cambia la geometria.

## API Del Componente

Inputs:

```ts
@Input() titulo = 'Sin nombre';
@Input() bloqueadaPorOverlay = false;
@Input() minWidth = 560;
@Input() minHeight = 340;
@Input() fixedWidth: number | null = null;
@Input() titleBarHeight = 44;
@Input() resizable = true;
@Input() zIndex: number | null = null;

@Input() minimizedVariant: 'bar' | 'bubble' = 'bar';
@Input() minimizedBubbleImageUrl: string | null = null;
@Input() minimizedBubbleIcon = 'forum';
@Input() minimizedBubbleLabel = 'Restaurar ventana';
@Input() minimizedAnchorsToViewportSides = true;

@Input() windowMode: FloatingWindowVisualMode | null = null;
@Input() restoredPlacementInput: FloatingWindowPlacementRestored | null = null;
@Input() minimizedPlacementInput: FloatingWindowPlacementMinimized | null = null;
@Input() persistPreviewPlacements = true;
```

Outputs:

```ts
@Output() cerrarSolicitado = new EventEmitter<void>();
@Output() focoSolicitado = new EventEmitter<void>();
@Output() windowModeChange = new EventEmitter<FloatingWindowVisualMode>();
@Output() restoredPlacementChange = new EventEmitter<FloatingWindowPlacementRestored | null>();
@Output() minimizedPlacementChange = new EventEmitter<FloatingWindowPlacementMinimized | null>();
```

El shell no destruye su contenido al pulsar cerrar. Emite la intencion; el padre decide si ocultar, destruir, confirmar o persistir.

## Uso Basico

```html
<app-floating-window
    titulo="Detalle"
    [minWidth]="560"
    [minHeight]="340"
    (cerrarSolicitado)="closeDetail()">
    <app-detail-content></app-detail-content>
</app-floating-window>
```

Uso controlado por un manager externo:

```html
<app-floating-window
    [titulo]="state.title"
    [windowMode]="state.mode"
    [restoredPlacementInput]="state.restoredPlacement"
    [minimizedPlacementInput]="state.minimizedPlacement"
    [persistPreviewPlacements]="false"
    [zIndex]="state.zIndex"
    (focoSolicitado)="focusWindow(state.id)"
    (windowModeChange)="updateMode(state.id, $event)"
    (restoredPlacementChange)="updateRestoredPlacement(state.id, $event)"
    (minimizedPlacementChange)="updateMinimizedPlacement(state.id, $event)">
</app-floating-window>
```

No mezclar persistencia interna y manager externo. Si `persistPreviewPlacements=false`, el padre es la autoridad.

## Estado Interno

```ts
interface WindowRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

rect: WindowRect;
isMinimized = false;
isMaximized = false;
private restoreRect: WindowRect | null = null;
```

`restoreRect` es un snapshot temporal usado al maximizar. `restoredPlacement` es la geometria persistible de la ventana normal.

## Host Global Y Pointer Events

Para varias ventanas, montar un host fijo:

```scss
:host {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1490;
}

.floating-window {
    position: fixed;
    pointer-events: auto;
}
```

El host no debe bloquear la aplicacion completa. Solo cada ventana recupera `pointer-events: auto`.

## Movimiento

El header inicia una interaccion solo con boton principal:

```ts
interface MoveInteraction {
    type: 'move';
    startPointerX: number;
    startPointerY: number;
    startRect: WindowRect;
}
```

Flujo:

1. Emitir foco al pulsar la ventana.
2. Ignorar si esta maximizada o bloqueada.
3. Ignorar controles dentro de `.no-drag`.
4. Guardar coordenadas y rect inicial.
5. Escuchar `document:pointermove`.
6. Calcular delta desde el inicio, no desde el ultimo evento.
7. Aplicar clamp al viewport.
8. En `pointerup`, persistir solo si cambio geometria.

Usar Pointer Events unifica raton y lapiz. Si se añade tactil, revisar scroll, captura de puntero y gestos antes de habilitarlo.

## Resize

El shell expone ocho zonas:

```text
nw   n   ne
w  ventana e
sw   s   se
```

Cada direccion modifica ejes y bordes correspondientes. Antes del clamp:

- Respetar `minWidth` y `minHeight`.
- Si se redimensiona desde norte u oeste, corregir `x` o `y` al aplicar el minimo.
- `fixedWidth` fuerza ancho y hace inutil el resize horizontal.
- No permitir resize minimizada ni maximizada.
- Ocultar handles si `resizable=false`.

## Clamp Al Viewport

La ventana usa 12 px de margen. La geometria se normaliza contra un viewport minimo defensivo de `640 x 480`.

```ts
const maxX = Math.max(padding, viewport.width - visualWidth - padding);
const maxY = Math.max(padding, viewport.height - visualHeight - padding);

x = clamp(x, padding, maxX);
y = clamp(y, padding, maxY);
```

El clamp usa el tamaño visual actual: barra o burbuja al minimizar, rect completo al restaurar.

En otra web conviene reclamplear tambien al evento `resize` del viewport. El componente actual clampa durante interacciones y cambios de estado, pero no mantiene un listener dedicado para recolocar todas las ventanas ya quietas.

## Minimizar Como Barra

En variante `bar`:

- Se oculta el contenido.
- La altura queda en `titleBarHeight`.
- El ancho se calcula con titulo y tres controles.
- El ancho queda entre 220 px y el viewport disponible.
- El titulo dinamico puede cambiar el ancho minimizado.

Al minimizar se guarda primero la geometria restaurada. Al restaurar se recupera esa geometria.

## Minimizar Como Burbuja

En variante `bubble`:

- El visual mide 56 x 56.
- Puede usar imagen o icono.
- El boton completo tiene `aria-label` descriptivo.
- Click restaura.
- Drag mueve sin restaurar.
- Tras un drag se suprime el click sintetico para evitar aperturas accidentales.

```html
<button
    class="floating-bubble"
    [attr.aria-label]="minimizedBubbleLabel"
    (pointerdown)="onBubblePointerDown($event)"
    (click)="onBubbleClick($event)">
</button>
```

## Anclaje Lateral Y Posicion Libre

Con `minimizedAnchorsToViewportSides=true`:

- La minimizada guarda `{ side, top }`.
- Decide izquierda/derecha segun el centro horizontal.
- Si parte exactamente centrada, el comportamiento actual desempata a la derecha.
- Al restaurar usa la geometria normal guardada.

Con `false`:

- La barra minimizada conserva posicion libre.
- Mantiene offsets respecto al cuadrante dominante del viewport.
- Al restaurar desde derecha o abajo conserva el offset a ese borde.
- No emite un placement lateral obsoleto.

La distincion evita que una barra libre se teletransporte al recibir feedback del padre.

## Maximizar Y Restaurar

- Maximizar guarda la geometria actual en `restoreRect`.
- Ocupa viewport menos 12 px por lado.
- Restaurar recupera snapshot y aplica clamp.
- Minimizar desde maximizada sale primero del estado maximizado.
- Maximizar desde minimizada conserva la geometria normal como destino de restauracion.

Los modos son mutuamente excluyentes.

## Foco Y Z-Index

El shell solo emite `focoSolicitado`. Un manager de varias ventanas debe incrementar un cursor:

```ts
private zIndexCursor = 1500;

private nextZIndex(): number {
    return ++this.zIndexCursor;
}
```

Al enfocar, actualizar solo el `zIndex` de esa ventana. No reordenar el DOM ni usar un z-index fijo comun para todas.

El cursor puede compactarse si la aplicacion abre miles de ventanas durante una sesion muy larga, aunque no es necesario para el volumen actual.

## Persistencia Interna Y Externa

Modo interno (`persistPreviewPlacements=true`):

- El componente carga placements desde `UserSettingsService`.
- Guarda al terminar movimiento o resize.
- Los fallos remotos no rompen el estado local.

Modo externo (`false`):

- Inputs rehidratan modo y geometria.
- Outputs notifican cambios.
- El manager decide debounce, cache local y backend.

Persistir al finalizar la interaccion, no en cada `pointermove`.

## Opciones Necesarias Para Guardar Posicion

Una version portable del shell deberia aceptar una configuracion explicita en vez de asumir siempre backend o una clave fija:

```ts
export interface FloatingWindowPersistenceOptions {
    enabled: boolean;
    storage: 'local' | 'remote' | 'local-and-remote';
    storageKey: string;
    actorId?: string | null;
    debounceMs?: number;
    restoreOnInit?: boolean;
    persistMode?: boolean;
    persistSize?: boolean;
    persistMinimizedPlacement?: boolean;
}

@Input() persistence: FloatingWindowPersistenceOptions = {
    enabled: false,
    storage: 'local',
    storageKey: 'floating-window',
    debounceMs: 180,
    restoreOnInit: true,
    persistMode: true,
    persistSize: true,
    persistMinimizedPlacement: true,
};
```

Campos imprescindibles:

- `storageKey`: identifica la ventana funcional, no su titulo visible.
- `actorId`: separa layouts de cuentas distintas.
- `restoreOnInit`: permite ventanas que siempre deben arrancar centradas.
- `persistMode`: decide si se recuerda minimizada/maximizada.
- `persistSize`: puede desactivarse en ventanas de ancho fijo.
- `persistMinimizedPlacement`: permite recordar el lateral de burbujas.
- `debounceMs`: agrupa cambios consecutivos sin guardar durante cada pixel de arrastre.

Construir una clave segura y estable:

```ts
function buildWindowStorageKey(options: FloatingWindowPersistenceOptions): string {
    const actor = `${options.actorId ?? 'anonymous'}`.trim() || 'anonymous';
    const windowKey = `${options.storageKey ?? ''}`.trim();
    if (!windowKey)
        throw new Error('La ventana necesita una storageKey estable.');
    return `my-app:floating-window:v1:${actor}:${windowKey}`;
}
```

No usar el titulo: puede traducirse o cambiar con datos de negocio.

## Shape Persistible Completo

```ts
export interface PersistedFloatingWindowState {
    version: 1;
    mode: FloatingWindowVisualMode;
    restoredPlacement: FloatingWindowPlacementRestored | null;
    minimizedPlacement: FloatingWindowPlacementMinimized | null;
    updatedAt: number;
}
```

Ejemplo guardado:

```json
{
  "version": 1,
  "mode": "window",
  "restoredPlacement": {
    "version": 1,
    "left": 132,
    "top": 84,
    "width": 720,
    "height": 520,
    "updatedAt": 1783941000000
  },
  "minimizedPlacement": {
    "version": 1,
    "side": "right",
    "top": 180,
    "updatedAt": 1783941000000
  },
  "updatedAt": 1783941000000
}
```

No guardar el rect maximizado calculado: depende del viewport actual. Guardar modo `maximized` y conservar el ultimo `restoredPlacement`.

## Store Local Portable

```ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FloatingWindowLocalStore {
    load(key: string): PersistedFloatingWindowState | null {
        try {
            const raw = localStorage.getItem(key);
            if (!raw)
                return null;
            return this.normalize(JSON.parse(raw));
        } catch {
            return null;
        }
    }

    save(key: string, state: PersistedFloatingWindowState): void {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch {
            // La ventana sigue operativa aunque el storage no este disponible.
        }
    }

    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {
            // noop
        }
    }

    private normalize(raw: any): PersistedFloatingWindowState | null {
        if (!raw || Number(raw.version) !== 1)
            return null;

        const mode: FloatingWindowVisualMode =
            raw.mode === 'minimized' || raw.mode === 'maximized'
                ? raw.mode
                : 'window';

        return {
            version: 1,
            mode,
            restoredPlacement: normalizeRestoredPlacement(raw.restoredPlacement),
            minimizedPlacement: normalizeMinimizedPlacement(raw.minimizedPlacement),
            updatedAt: toPositiveTimestamp(raw.updatedAt) ?? Date.now(),
        };
    }
}
```

Normalizadores:

```ts
function normalizeRestoredPlacement(raw: any): FloatingWindowPlacementRestored | null {
    const left = Number(raw?.left);
    const top = Number(raw?.top);
    const width = Number(raw?.width);
    const height = Number(raw?.height);
    if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
        return null;
    return {
        version: 1,
        left,
        top,
        width,
        height,
        updatedAt: toPositiveTimestamp(raw?.updatedAt) ?? Date.now(),
    };
}

function normalizeMinimizedPlacement(raw: any): FloatingWindowPlacementMinimized | null {
    const top = Number(raw?.top);
    if ((raw?.side !== 'left' && raw?.side !== 'right') || !Number.isFinite(top))
        return null;
    return {
        version: 1,
        side: raw.side,
        top,
        updatedAt: toPositiveTimestamp(raw?.updatedAt) ?? Date.now(),
    };
}

function toPositiveTimestamp(value: any): number | null {
    const parsed = Math.trunc(Number(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
```

Despues de normalizar, el componente debe aplicar `minWidth`, `minHeight` y clamp al viewport actual. Un placement valido del monitor anterior puede estar fuera de pantalla en el nuevo.

## Guardado Al Terminar La Interaccion

```ts
@HostListener('document:pointerup')
onPointerUp(): void {
    const interaction = this.activeInteraction;
    if (!interaction)
        return;

    const changed = !sameRect(interaction.startRect, this.rect);
    this.activeInteraction = null;

    if (!changed)
        return;

    if (this.isMinimized)
        this.captureMinimizedPlacement();
    else if (!this.isMaximized)
        this.captureRestoredPlacement();

    this.schedulePersistence();
}
```

Payload desde el estado actual:

```ts
private buildPersistedState(): PersistedFloatingWindowState {
    return {
        version: 1,
        mode: this.isMaximized
            ? 'maximized'
            : this.isMinimized
                ? 'minimized'
                : 'window',
        restoredPlacement: this.persistence.persistSize === false
            ? this.restoredPlacement && {
                ...this.restoredPlacement,
                width: this.fixedWidth ?? this.restoredPlacement.width,
            }
            : this.restoredPlacement,
        minimizedPlacement: this.persistence.persistMinimizedPlacement === false
            ? null
            : this.minimizedPlacement,
        updatedAt: Date.now(),
    };
}
```

Debounce:

```ts
private persistTimer: number | null = null;

private schedulePersistence(): void {
    if (!this.persistence.enabled)
        return;
    if (this.persistTimer !== null)
        window.clearTimeout(this.persistTimer);

    this.persistTimer = window.setTimeout(() => {
        this.persistTimer = null;
        const key = buildWindowStorageKey(this.persistence);
        this.localStore.save(key, this.buildPersistedState());
    }, Math.max(0, this.persistence.debounceMs ?? 180));
}
```

Cancelar el timer en `ngOnDestroy`.

## Restauracion Segura

```ts
private restorePersistedState(): void {
    if (!this.persistence.enabled || this.persistence.restoreOnInit === false)
        return;

    const key = buildWindowStorageKey(this.persistence);
    const state = this.localStore.load(key);
    if (!state)
        return;

    this.restoredPlacement = state.restoredPlacement;
    this.minimizedPlacement = state.minimizedPlacement;

    const restoredRect = this.restoredPlacement
        ? {
            x: this.restoredPlacement.left,
            y: this.restoredPlacement.top,
            width: this.restoredPlacement.width,
            height: this.restoredPlacement.height,
        }
        : this.getInitialRect();

    this.rect = this.clampRectToViewport(restoredRect);
    this.applyMode(this.persistence.persistMode === false ? 'window' : state.mode);
}
```

Restaurar despues de conocer inputs de tamaño y antes de pintar, o mostrar inicialmente con `visibility:hidden` hasta terminar la hidratacion para evitar un salto visual.

## Backend Opcional

Para sincronizar entre dispositivos, definir un puerto en vez de acoplar el shell a `HttpClient`:

```ts
export interface FloatingWindowRemoteStore {
    load(actorId: string, storageKey: string): Promise<PersistedFloatingWindowState | null>;
    save(actorId: string, storageKey: string, state: PersistedFloatingWindowState): Promise<void>;
}
```

Estrategia `local-and-remote`:

1. Guardar local de inmediato.
2. Guardar remoto con debounce.
3. Al arrancar, leer ambos.
4. Elegir el mayor `updatedAt`.
5. Aplicar clamp local tras elegir.

```ts
const selected = !remote
    ? local
    : !local
        ? remote
        : local.updatedAt >= remote.updatedAt ? local : remote;
```

El backend debe autorizar por actor autenticado. No aceptar un `actorId` arbitrario enviado como autoridad del payload.

## Overlays Bloqueantes

`bloqueadaPorOverlay` evita foco, movimiento, resize y controles. En el CSS actual la ventana se oculta con `display:none`.

Para un manager con varias ventanas es preferible:

1. Tomar snapshot del estado visible.
2. Ocultar temporalmente sin persistir el cierre.
3. Mostrar el overlay.
4. Restaurar el snapshot al cerrarlo.

No convertir un ocultado temporal en una preferencia permanente de ventana cerrada.

## Template Base

```html
<div
    class="floating-window"
    [ngStyle]="containerStyle"
    (pointerdown)="onContainerPointerDown()">

    <div class="floating-window__header" (pointerdown)="onTitleBarPointerDown($event)">
        <div class="floating-window__title">{{ title }}</div>
        <div class="floating-window__actions no-drag">
            <button type="button" (click)="toggleMinimize()" aria-label="Minimizar ventana"></button>
            <button type="button" (click)="toggleMaximize()" aria-label="Maximizar ventana"></button>
            <button type="button" (click)="requestClose()" aria-label="Cerrar ventana"></button>
        </div>
    </div>

    <div class="floating-window__content" *ngIf="!isMinimized">
        <ng-content></ng-content>
    </div>
</div>
```

## Accesibilidad

- Todos los controles iconicos tienen `aria-label` dinamico.
- La burbuja anuncia que conversacion o ventana restaura.
- No convertir toda ventana en `role=dialog` automaticamente: algunas son herramientas no modales.
- Mantener foco de teclado visible en controles.
- El drag no puede ser la unica forma de recuperar contenido fuera de sitio; clamp y defaults son obligatorios.
- Considerar botones alternativos de recolocacion si el producto tiene requisitos de accesibilidad motriz altos.

## Pruebas Minimas

- Minimiza como barra y oculta contenido.
- Minimiza como burbuja y diferencia click de drag.
- Maximiza y restaura geometria.
- Arrastre actualiza posicion y respeta viewport.
- Resize respeta minimos en ocho direcciones.
- `fixedWidth` mantiene ancho y desactiva resize.
- Persiste solo si hubo cambio.
- Carga geometria guardada por actor.
- Anclaje lateral elige lado correcto.
- Posicion libre conserva offsets de derecha y abajo.
- Feedback controlado del padre no teletransporta una minimizada.
- Overlay bloquea interaccion sin perder estado.
- Foco emite y el manager eleva z-index.
- Cierre solo emite intencion.

## Checklist Para El Codex De La Otra Web

- [ ] Mover el shell a una carpeta shared.
- [ ] Definir rect, placements versionados y modos.
- [ ] Implementar host con pointer-events selectivos.
- [ ] Implementar movimiento por Pointer Events.
- [ ] Implementar resize y minimos.
- [ ] Aplicar clamp segun tamaño visual.
- [ ] Implementar barra y burbuja minimizadas.
- [ ] Separar anclaje lateral de posicion libre.
- [ ] Implementar maximizar/restaurar.
- [ ] Delegar z-index al manager.
- [ ] Elegir persistencia interna o controlada, sin mezclarlas.
- [ ] Añadir snapshot para overlays temporales.
- [ ] Limitar el montaje a escritorio.
- [ ] Cubrir geometria y ciclo de vida con pruebas.
