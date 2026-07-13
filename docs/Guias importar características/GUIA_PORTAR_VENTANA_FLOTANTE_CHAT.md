# Guia Para Portar La Ventana Flotante De Chat

## Objetivo

Esta guia documenta la feature de chat flotante de Fichas 3.5 construida sobre el shell generico de ventanas. Incluye:

- Un host global de overlays.
- Una ventana-listado de chats.
- Una ventana por conversacion.
- Minimizacion de conversaciones como burbujas.
- Foco y apilado.
- Persistencia por actor.
- Prevencion de colisiones entre burbujas.
- Integracion con REST, realtime, restricciones y overlays.

Para portar solo movimiento, resize y modos visuales, usar `GUIA_PORTAR_SISTEMA_VENTANAS_FLOTANTES.md`. Para la pantalla completa de mensajes, usar `GUIA_PORTAR_PANTALLA_SOCIAL_MENSAJES.md`.

## Archivos De Referencia

- `src/app/services/chat-floating.service.ts`
- `src/app/services/chat-floating.service.spec.ts`
- `src/app/components/chat-floating/chat-floating-host.component.ts`
- `src/app/components/chat-floating/chat-floating-host.component.html`
- `src/app/components/chat-floating/chat-floating-host.component.sass`
- `src/app/components/chat-floating/chat-floating-list-window.component.ts`
- `src/app/components/chat-floating/chat-floating-list-window.component.html`
- `src/app/components/chat-floating/chat-floating-list-window.component.sass`
- `src/app/components/chat-floating/chat-floating-conversation-window.component.ts`
- `src/app/components/chat-floating/chat-floating-conversation-window.component.html`
- `src/app/components/chat-floating/chat-floating-conversation-window.component.sass`
- `src/app/interfaces/user-settings.ts`
- `src/app/services/chat-realtime.service.ts`
- `src/app/services/chat-api.service.ts`

## Arquitectura

```text
AppComponent (solo desktop)
        |
        v
ChatFloatingHostComponent
        |
        +--> ventana-listado "Chats"
        |
        +--> conversacion 14: ventana <-> burbuja
        +--> conversacion 27: ventana <-> burbuja
        +--> conversacion 31: ventana <-> burbuja

ChatFloatingService = autoridad de estado, foco y persistencia
ChatRealtimeService = conversaciones, mensajes y lectura compartida
ChatApiService      = historial, detalle y mutaciones
```

El host solo renderiza. El manager decide que esta abierto y con que geometria. Cada ventana concreta gestiona su contenido de chat y emite cambios visuales.

## Montaje Global

En la raiz:

```html
<app-navbar></app-navbar>
<app-main></app-main>
<app-chat-floating-host *ngIf="isDesktopLayout"></app-chat-floating-host>
```

El host debe vivir fuera del layout con scroll para que `position: fixed` se refiera al viewport.

```scss
:host {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1490;
}
```

Las ventanas hijas reactivan `pointer-events: auto`.

## Preferencias Y Estado Persistido

```ts
export type ChatFloatingListWindowMode = 'window' | 'minimized' | 'maximized';
export type ChatFloatingBubbleMode = 'window' | 'bubble' | 'maximized';

export interface ChatFloatingWindowState {
    version: 1;
    mode: ChatFloatingListWindowMode;
    restoredPlacement: FloatingWindowPlacementRestored | null;
    minimizedPlacement: FloatingWindowPlacementMinimized | null;
    updatedAt: number;
}

export interface ChatFloatingBubbleState {
    version: 1;
    conversationId: number;
    mode: ChatFloatingBubbleMode;
    restoredPlacement: FloatingWindowPlacementRestored | null;
    bubblePlacement: FloatingWindowPlacementMinimized | null;
    updatedAt: number;
}

export interface ChatFloatingSettings {
    version: 1;
    ventana_chat: ChatFloatingWindowState | null;
    burbujas_abiertas: ChatFloatingBubbleState[];
}
```

Preferencias de perfil:

```ts
autoAbrirVentanaChats: boolean;
permitirBurbujasChat: boolean;
```

`autoAbrirVentanaChats` gobierna la ventana-listado al iniciar. `permitirBurbujasChat` gobierna conversaciones separadas; si esta desactivado, abrir una conversacion navega a `Social > Mensajes`.

## Estado Runtime

El runtime añade campos no persistidos:

```ts
interface FloatingChatListRuntimeState {
    open: boolean;
    mode: 'window' | 'minimized' | 'maximized';
    restoredPlacement: FloatingWindowPlacementRestored | null;
    minimizedPlacement: FloatingWindowPlacementMinimized | null;
    zIndex: number;
    updatedAt: number;
}

interface FloatingChatBubbleRuntimeState {
    conversationId: number;
    mode: 'window' | 'bubble' | 'maximized';
    restoredPlacement: FloatingWindowPlacementRestored | null;
    bubblePlacement: FloatingWindowPlacementMinimized | null;
    zIndex: number;
    updatedAt: number;
}
```

`zIndex` se regenera por sesion. No es una preferencia durable.

El manager expone:

```ts
readonly listWindow$;
readonly bubbles$;
readonly bubbleFeatureEnabled$;
readonly autoOpenList$;
```

## Inicializacion Por Actor

`ChatFloatingService.init()` se llama una sola vez desde la raiz.

Al iniciar sesion:

1. Resolver UID actual.
2. Evitar bootstrap duplicado si se reemite login para el mismo UID.
3. Cargar settings actor-scoped.
4. Aplicar preferencias.
5. Leer draft local del mismo UID.
6. Elegir remoto o local segun `updatedAt` mas reciente.
7. Rehidratar ventana y burbujas.
8. Aplicar restricciones activas antes de mostrar.

Al logout:

- Cancelar persistencia pendiente.
- Vaciar ventana y burbujas.
- Restaurar defaults internos.
- Limpiar identidad de bootstrap.

La clave local incluye actor:

```ts
f35:chat-floating:draft:<uid>
```

No usar una clave global compartida entre cuentas.

## Host

```html
<ng-container *ngIf="listWindow$ | async as listWindow">
    <app-chat-floating-list-window
        *ngIf="listWindow.open"
        [mode]="listWindow.mode"
        [restoredPlacement]="listWindow.restoredPlacement"
        [minimizedPlacement]="listWindow.minimizedPlacement"
        [zIndex]="listWindow.zIndex"
        (closeRequested)="manager.closeListWindow()"
        (focusRequested)="manager.focusListWindow()"
        (stateChange)="updateListState($event)">
    </app-chat-floating-list-window>
</ng-container>

<app-chat-floating-conversation-window
    *ngFor="let bubble of (bubbles$ | async); trackBy: trackByConversationId"
    [conversationId]="bubble.conversationId"
    [mode]="bubble.mode"
    [restoredPlacement]="bubble.restoredPlacement"
    [bubblePlacement]="bubble.bubblePlacement"
    [zIndex]="bubble.zIndex">
</app-chat-floating-conversation-window>
```

Usar `conversationId` como `trackBy` evita destruir historial y borradores al cambiar z-index o geometria.

## Ventana-Listado De Chats

La ventana `Chats` es estrecha y no redimensionable:

```html
<app-ventana-detalle-flotante
    titulo="Chats"
    [minWidth]="320"
    [minHeight]="520"
    [fixedWidth]="320"
    [resizable]="false"
    [persistPreviewPlacements]="false"
    [minimizedAnchorsToViewportSides]="false">
</app-ventana-detalle-flotante>
```

Contenido:

- Filtros por tipo.
- Busqueda por nombre, mostrada solo si hay overflow o query activa.
- Compositor compacto para directo o grupo.
- Lista ordenada por actividad.
- Preview y contador no leido.
- Estado vacio.

Seleccionar una conversacion llama a `manager.openConversation(id)`; no carga el historial dentro de la ventana-listado.

La deteccion de overflow se difiere con `requestAnimationFrame` tras cambios, modo o resize. Medir sin esperar al render produce falsos negativos.

## Abrir Y Cerrar La Ventana-Listado

Abrir o enfocar:

- Reutiliza estado previo si existe.
- Marca `open=true`.
- Eleva z-index.
- Quita el foco de conversacion activa en realtime.

Cerrar manualmente:

- Mantiene placements.
- Marca `open=false`.
- Cambia `autoAbrirVentanaChats=false`.
- Persiste inmediatamente preferencia y layout.

Esto evita que una ventana cerrada voluntariamente reaparezca tras recargar. Abrirla manualmente no debe interpretarse automaticamente como reactivar la autoapertura salvo decision explicita del producto.

## Abrir Una Conversacion

```ts
openConversation(conversationId: number): void {
    if (restrictionBlocked) {
        openRestrictionScreen();
        return;
    }

    if (!bubblesEnabled) {
        navigation.openSocial({ section: 'mensajes', conversationId });
        return;
    }

    if (alreadyOpen(conversationId)) {
        focusConversation(conversationId);
        return;
    }

    addRuntimeWindow({
        conversationId,
        mode: 'window',
        restoredPlacement: null,
        bubblePlacement: null,
        zIndex: nextZIndex(),
    });
}
```

No crear dos ventanas para la misma conversacion.

## Ventana De Conversacion

Cada instancia recibe solo `conversationId` y estado visual. Al montar:

- Se suscribe al store de resumenes.
- Se suscribe a mensajes creados.
- Se suscribe a acuses de lectura propios.
- Carga amistades si necesita administrar grupo.
- Solicita historial y detalle en paralelo.
- Marca la conversacion como activa/focal.

Contenido funcional:

- Estado de sistema, campaña o `canSend=false`.
- Chips de participantes.
- Administracion de grupo para admins.
- Paginacion de historial.
- Mensajes humanos y de sistema.
- Acciones tipadas de mensajes de sistema.
- Compositor.

La ventana reutiliza los mismos contratos, resolver de titulo, API y store realtime que `Social > Mensajes`. No crear DTOs flotantes paralelos.

## Modo Burbuja

El modo de negocio es `bubble`, pero el shell generico recibe `minimized`:

```html
[minimizedVariant]="mode === 'bubble' ? 'bubble' : 'bar'"
[windowMode]="mode === 'bubble' ? 'minimized' : mode"
[minimizedAnchorsToViewportSides]="mode === 'bubble'"
```

Icono/imagen:

- Sistema: icono institucional.
- Campaña: icono de campaña.
- Grupo: icono de grupo.
- Directo: foto o avatar fallback.
- `aria-label`: `Abrir <titulo canonico>`.

Al recibir `windowModeChange('minimized')`, la ventana concreta lo traduce de vuelta a `bubble` antes de persistir.

## Foco Y Lectura

El sistema mantiene una sola conversacion considerada activa en cada momento. Al enfocar una ventana:

- Elevar z-index.
- Ejecutar `setActiveConversationId(conversationId)`.
- Intentar marcar el ultimo mensaje como leido.

`isConversationFocused` exige ademas:

- Documento visible.
- Ventana del navegador con foco.

Esto evita marcar como leido solo porque una burbuja existe en segundo plano.

Al cerrar la conversacion activa, limpiar el id activo. Si quedan otras ventanas, no elegir una arbitrariamente hasta que el usuario la enfoque.

## Realtime Y Deduplicacion

Cada ventana filtra `messageCreated$` por `conversationId` y por `messageId` no existente. El envio HTTP tambien comprueba duplicado porque el eco realtime puede llegar antes o despues de la respuesta REST.

Los acuses usan mapas por conversacion de ultimo confirmado y ultimo in-flight. Solo se envia un id mayor que ambos.

`ChatAlertService` consulta si la conversacion esta abierta para no mostrar toast de mensaje nuevo redundante. Mantener esta integracion al portar.

## Persistencia

Hay dos velocidades:

1. Draft local inmediato por actor.
2. Persistencia remota debounced a 180 ms.

Cambios de modo o geometria importantes pueden llamar a `persistStateSoon()` para serializar escrituras consecutivas.

Payload:

```ts
{
    version: 1,
    ventana_chat: { ... },
    burbujas_abiertas: [ ... ]
}
```

No persistir:

- Mensajes.
- Borradores de texto.
- Participantes.
- z-index runtime.
- Tokens o datos realtime.

Si backend rechaza el shape nuevo de settings con un 400 conocido, el manager bloquea persistencia automatica durante esa sesion para evitar una tormenta de errores. El layout local sigue funcionando.

## Ejemplo De Actualizacion Y Guardado De Posicion

El shell emite modo y placements; el host los reenvia al manager:

```ts
updateBubbleState(
    conversationId: number,
    event: {
        mode: 'window' | 'bubble' | 'maximized';
        restoredPlacement: FloatingWindowPlacementRestored | null;
        bubblePlacement: FloatingWindowPlacementMinimized | null;
    }
): void {
    this.chatFloating.updateConversationState(
        conversationId,
        event.mode,
        event.restoredPlacement,
        event.bubblePlacement
    );
}
```

El manager actualiza inmutablemente y persiste:

```ts
updateConversationState(
    conversationId: number,
    mode: ChatFloatingBubbleState['mode'],
    restoredPlacement: FloatingWindowPlacementRestored | null,
    bubblePlacement: FloatingWindowPlacementMinimized | null
): void {
    const next = this.bubblesSubject.value.map((item) => {
        if (item.conversationId !== conversationId)
            return item;

        return {
            ...item,
            mode,
            restoredPlacement: restoredPlacement
                ? { ...restoredPlacement }
                : item.restoredPlacement,
            bubblePlacement: bubblePlacement
                ? { ...bubblePlacement }
                : item.bubblePlacement,
            updatedAt: Date.now(),
        };
    });

    this.bubblesSubject.next(
        this.normalizeBubbleCollisions(next, mode === 'bubble' ? conversationId : null)
    );
    this.schedulePersist();
}
```

Para permitir limpiar expresamente un placement, una API nueva deberia distinguir `undefined` de `null`:

```ts
interface FloatingPlacementPatch {
    restoredPlacement?: FloatingWindowPlacementRestored | null;
    minimizedPlacement?: FloatingWindowPlacementMinimized | null;
}
```

- `undefined`: conservar valor anterior.
- `null`: borrar valor anterior.
- objeto: reemplazar por copia.

Esto es mas robusto que interpretar todo `null` como “conservar”.

## Ejemplo De Payload Y Persistencia Remota

```ts
private buildFloatingSettingsPayload(): ChatFloatingSettings {
    const list = this.listWindowSubject.value;
    return {
        version: 1,
        ventana_chat: list ? {
            version: 1,
            mode: list.mode,
            restoredPlacement: list.restoredPlacement
                ? { ...list.restoredPlacement }
                : null,
            minimizedPlacement: list.minimizedPlacement
                ? { ...list.minimizedPlacement }
                : null,
            updatedAt: list.updatedAt,
        } : null,
        burbujas_abiertas: this.bubblesSubject.value.map((bubble) => ({
            version: 1,
            conversationId: bubble.conversationId,
            mode: bubble.mode,
            restoredPlacement: bubble.restoredPlacement
                ? { ...bubble.restoredPlacement }
                : null,
            bubblePlacement: bubble.bubblePlacement
                ? { ...bubble.bubblePlacement }
                : null,
            updatedAt: bubble.updatedAt,
        })),
    };
}
```

Persistencia local inmediata y remota debounced:

```ts
private schedulePersist(): void {
    const uid = `${this.currentUid ?? ''}`.trim();
    if (!uid)
        return;

    const payload = this.buildFloatingSettingsPayload();
    localStorage.setItem(
        `my-app:chat-floating:v1:${uid}`,
        JSON.stringify(payload)
    );

    if (this.persistTimer !== null)
        window.clearTimeout(this.persistTimer);

    this.persistTimer = window.setTimeout(async () => {
        this.persistTimer = null;
        try {
            await this.settingsApi.patchChatFloatingSettings(payload);
            localStorage.removeItem(`my-app:chat-floating:v1:${uid}`);
        } catch {
            // El draft local se conserva para el siguiente bootstrap.
        }
    }, 180);
}
```

El endpoint recomendado recibe solo el bloque de chat flotante o aplica un patch con control de version. Si la API obliga a guardar settings completos:

1. Cargar settings actuales.
2. Reemplazar solo `mensajeria_flotante`.
3. Conservar el resto de preferencias.
4. Evitar dos guardados concurrentes que se pisen.

Serializacion simple de escrituras:

```ts
private persistInFlight: Promise<void> = Promise.resolve();

private queueRemotePersist(payload: ChatFloatingSettings): void {
    this.persistInFlight = this.persistInFlight
        .catch(() => undefined)
        .then(() => this.settingsApi.patchChatFloatingSettings(payload));
}
```

## Opciones Recomendadas De La Feature

```ts
export interface ChatFloatingFeatureOptions {
    desktopMinWidth: number;
    desktopMinHeight: number;
    persistLayout: boolean;
    persistOpenConversations: boolean;
    autoOpenListByDefault: boolean;
    bubblesEnabledByDefault: boolean;
    maxOpenConversations: number | null;
    remoteDebounceMs: number;
    bubbleSize: number;
    viewportPadding: number;
    bubbleGap: number;
    maxCoveredRatio: number;
}

export const DEFAULT_CHAT_FLOATING_OPTIONS: ChatFloatingFeatureOptions = {
    desktopMinWidth: 1250,
    desktopMinHeight: 700,
    persistLayout: true,
    persistOpenConversations: true,
    autoOpenListByDefault: true,
    bubblesEnabledByDefault: true,
    maxOpenConversations: null,
    remoteDebounceMs: 180,
    bubbleSize: 56,
    viewportPadding: 12,
    bubbleGap: 8,
    maxCoveredRatio: 0.5,
};
```

Si se fija `maxOpenConversations`, al alcanzar el limite conviene enfocar una existente o pedir al usuario que cierre una; no cerrar silenciosamente la mas antigua si contiene un borrador.

## Resolucion Entre Draft Local Y Remoto

Comparar el `updatedAt` maximo entre ventana y burbujas. Elegir el bloque completo mas reciente.

Esta estrategia es simple y evita mezclar dos layouts incompatibles. Si la otra web necesita merge por ventana, debe resolver conflictos por id y documentar eliminaciones tombstone; no basta con concatenar arrays.

## Colisiones Entre Burbujas

Constantes actuales:

```ts
bubbleVisualSize = 56;
bubbleViewportPadding = 12;
bubbleCollisionGap = 8;
bubbleMaxCoveredRatio = 0.5;
```

Solo se comparan burbujas del mismo lateral. Si dos comparten mas del 50 % de altura:

1. Mantener fija la burbuja que el usuario acaba de mover.
2. Ordenar las demas por `top`.
3. Buscar la posicion libre mas cercana arriba o abajo.
4. Exigir separacion `size + gap`.
5. Clamp entre padding superior e inferior.

Burbujas en laterales opuestos no colisionan.

No normalizar ventanas expandidas con este algoritmo; solo `mode === 'bubble'`.

## Overlays Temporales

Para un modal u overlay incompatible con ventanas flotantes:

```ts
const snapshot = manager.hideAllFloatingWindowsForOverlay();
openOverlay();
manager.restoreFloatingWindowsAfterOverlay(snapshot);
```

El snapshot clona placements y burbujas. Ocultar asi:

- No persiste cierres.
- Limpia foco realtime temporal.
- Restaura con nuevos z-index.
- Vuelve a normalizar colisiones.

Si durante el overlay aparece una restriccion de cuenta, no restaurar las ventanas.

## Restricciones Y Compliance

Una restriccion temporal o permanente:

- Cierra visualmente ventana-listado y conversaciones.
- Limpia conversacion activa.
- Persiste el estado permitido segun contrato.
- Redirige a la pantalla de cuenta restringida si el actor intenta reabrir.

Mutaciones de chat vuelven a validar `usage` antes de llamar a API. Si backend devuelve un error funcional de compliance, traducirlo al copy canonico.

El bootstrap debe comprobar la restriccion despues de hidratar settings para no hacer visible durante un frame un layout prohibido.

## Desactivar Burbujas

Al aplicar `permitirBurbujasChat=false`:

- Vaciar conversaciones flotantes.
- Limpiar foco realtime.
- Persistir el nuevo layout.
- Futuras aperturas navegan a `Social > Mensajes`.

La ventana-listado puede seguir existiendo: la preferencia afecta a conversaciones separadas, no necesariamente al listado.

## Creacion De Directos Y Grupos Desde La Ventana-Listado

La ventana-listado replica un subconjunto de la pantalla completa:

- Busqueda desde dos caracteres con debounce.
- Elegibilidad por amistad o permiso de directos externos.
- Exclusión del actor y de directos existentes.
- Creacion de grupo con amistades activas.
- Restricciones de uso antes de mutar.
- Tras crear, `upsertConversation` y apertura flotante de la conversacion.

Extraer helpers compartidos si ambas superficies empiezan a divergir. No mantener dos reglas de elegibilidad distintas.

## Registro Angular

Declarar:

```ts
ChatFloatingHostComponent,
ChatFloatingListWindowComponent,
ChatFloatingConversationWindowComponent,
VentanaDetalleFlotanteComponent,
```

Importar los modulos de formularios, iconos, botones, inputs y tooltips usados por los templates.

Inicializar el manager y realtime una sola vez desde la raiz; no desde cada ventana.

## Pruebas Minimas

Manager:

- Si burbujas estan desactivadas, redirige a Social.
- Abre una sola ventana por conversacion y la enfoca si ya existe.
- Eleva z-index al enfocar.
- Cierra y limpia foco activo.
- Separa burbujas solapadas del mismo lateral.
- No mueve burbujas de laterales opuestos.
- Oculta y restaura por overlay.
- Bloquea y redirige durante restricciones.
- No reabre al reemitirse login del mismo UID.
- Autoabre segun preferencia.
- Cierre manual desactiva autoapertura persistida.
- Rehidrata desde draft local mas reciente.
- Deja de persistir si backend rechaza el shape.

Ventana-listado:

- Filtra, ordena y busca conversaciones.
- Muestra buscador solo al existir overflow o query.
- Usa titulo canonico de campaña.
- Crea directo/grupo y abre la conversacion.
- Bloquea mutaciones por compliance.

Conversacion:

- Carga detalle e historial.
- Inserta realtime sin duplicar.
- Envia sin duplicar eco.
- Marca leido solo con foco real.
- Pagina anteriores.
- Traduce ventana minimizada a modo burbuja.
- Gestiona grupo solo para admins.
- Ejecuta acciones tipadas de sistema.
- Aplica tono danger a moderacion y baneo.

Integracion:

- El host solo existe en desktop.
- Logout limpia estado actor-scoped.
- Social oculta `Abrir chats en ventana` si ya esta abierta.
- Toast de mensaje se suprime para conversacion abierta.

## Checklist Para El Codex De La Otra Web

- [ ] Portar primero el shell generico de ventanas.
- [ ] Portar contratos compartidos de chat y titulo canonico.
- [ ] Crear manager singleton con estado runtime reactivo.
- [ ] Montar host global solo en desktop.
- [ ] Crear ventana-listado sin cargar historiales.
- [ ] Crear ventana de conversacion reutilizando API y realtime.
- [ ] Traducir `minimized` del shell a `bubble` de negocio.
- [ ] Implementar foco y z-index.
- [ ] Deduplicar mensajes y acuses.
- [ ] Persistir layout por actor con draft local.
- [ ] Desactivar autoapertura al cierre manual.
- [ ] Normalizar colisiones de burbujas.
- [ ] Soportar snapshot de overlays.
- [ ] Aplicar restricciones antes y despues de hidratar.
- [ ] Mantener Social como fallback cuando no haya burbujas o desktop.
