# Guia Para Portar La Campana De Notificaciones

## Objetivo

Esta guia esta pensada para el Codex de otra web. Documenta la campana de notificaciones de Fichas 3.5: un historico local de avisos recientes que captura toasts y determinados `SweetAlert2`, muestra no leidos, permite acciones y conserva entradas durante 24 horas.

La campana complementa el feedback inmediato. No sustituye al toast, al dialogo ni a las notificaciones persistentes del backend.

## Alcance Real Del Sistema

La implementacion actual es un centro de notificaciones de sesion con persistencia local temporal:

- Estado reactivo mediante `BehaviorSubject`.
- Entradas ordenadas de mas reciente a mas antigua.
- Indicador de avisos no vistos.
- Deduplicacion y contador `xN`.
- Captura automatica de toasts.
- Captura selectiva de SweetAlerts.
- Acciones opcionales ejecutables desde una entrada.
- Countdown opcional actualizado mientras el menu esta abierto.
- Borrado individual y borrado total.
- Persistencia en `localStorage` durante un maximo de 24 horas.
- Limpieza actor-scoped al cerrar sesion.

No incluye:

- Sincronizacion entre dispositivos.
- Confirmacion de entrega por backend.
- Escucha del evento `storage` entre tabs del navegador.
- Persistencia durable de acciones navegables.
- Un contador numerico de no leidos; el diseño actual usa un punto.

Si la otra web necesita una bandeja durable multi-dispositivo, debe usar ids y destinos serializables procedentes de backend. `localStorage` no es suficiente.

## Arquitectura

```text
Toast service -----------+
                         |
SweetAlert global -------+--> SessionNotificationCenterService
                         |         |              |
Productores directos ----+         |              +--> localStorage (24 h)
                                   |
                                   +--> Navbar / campana
                                            |
                                            +--> marcar visto
                                            +--> borrar
                                            +--> ejecutar accion
```

## Archivos De Referencia En Fichas 3.5

- `src/app/interfaces/session-notification.ts`
  - Contratos de entrada, input y metadata para SweetAlert.
- `src/app/services/session-notification-center.service.ts`
  - Estado, deduplicacion, captura, persistencia y restauracion.
- `src/app/services/app-toast.service.ts`
  - Captura automatica de cada toast salvo opt-out.
- `src/app/app.component.ts`
  - Wrapper global de `Swal.fire` que captura avisos elegibles.
- `src/app/components/base/navbar/navbar.component.ts`
  - Estado de la campana, vistos, countdown, acciones y limpieza al logout.
- `src/app/components/base/navbar/navbar.component.html`
  - Trigger, punto de no leidos y listado accesible.
- `src/app/components/base/navbar/navbar.component.sass`
  - Layout del menu y estados visuales.
- `src/app/services/chat-alert.service.ts`
  - Ejemplo de avisos realtime navegables.

## Dependencias

Version actual:

- Angular 20.
- RxJS 7.
- SweetAlert2.
- Angular Material Menu, Icon y Tooltip para la UI concreta.

La logica central solo necesita Angular, RxJS y una API de almacenamiento compatible con `Storage`. La UI puede implementarse con otra libreria.

## Modelo De Datos

```ts
import { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

export type NotificationSource = 'toast' | 'swal';
export type NotificationLevel =
    | 'success'
    | 'error'
    | 'info'
    | 'system'
    | 'warning';

export type NotificationActionHandler = () => void | Promise<void>;

export interface NotificationEntry {
    id: string;
    dedupeKey: string | null;
    source: NotificationSource;
    level: NotificationLevel;
    title: string;
    message: string;
    createdAt: number;
    seenAt: number | null;
    countdownUntil: number | null;
    countdownLabel: string | null;
    repeatCount: number;
    actionLabel: string | null;
    action: NotificationActionHandler | null;
}

export interface NotificationEntryInput {
    dedupeKey?: string | null;
    source: NotificationSource;
    level: NotificationLevel;
    title?: string | null;
    message?: string | null;
    countdownUntil?: number | null;
    countdownLabel?: string | null;
    repeatCount?: number | null;
    actionLabel?: string | null;
    action?: NotificationActionHandler | null;
}

export interface NotificationSwalMetadata {
    include?: boolean;
    title?: string | null;
    message?: string | null;
    level?: NotificationLevel | SweetAlertIcon | null;
    actionLabel?: string | null;
    action?: NotificationActionHandler | null;
}

export type NotificationSwalOptions = SweetAlertOptions & {
    sessionNotification?: NotificationSwalMetadata | boolean;
};
```

Significado de los campos:

- `dedupeKey`: identidad funcional estable para reemplazar una entrada equivalente.
- `source`: origen visual inmediato, no origen de backend.
- `seenAt`: `null` significa no vista.
- `countdownUntil`: timestamp futuro en milisegundos.
- `repeatCount`: numero de apariciones agrupadas.
- `actionLabel`: copy de la accion mostrada.
- `action`: callback ejecutable solo mientras vive la aplicacion actual.

## Servicio Central

El servicio debe exponer observables y mantener mutaciones encapsuladas:

```ts
@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
    private readonly storageKey = 'my-app.session-notifications.v1';
    private readonly maxEntryAgeMs = 24 * 60 * 60 * 1000;
    private readonly entriesSubject = new BehaviorSubject<NotificationEntry[]>([]);
    private sequence = 0;

    readonly entries$ = this.entriesSubject.asObservable();
    readonly hasUnread$ = this.entries$.pipe(
        map((entries) => entries.some((entry) => entry.seenAt === null)),
        distinctUntilChanged()
    );

    constructor() {
        this.restoreEntries();
    }
}
```

API publica recomendada:

```ts
add(entry: NotificationEntryInput): string;
remove(id: string): void;
clear(): void;
markSeen(ids: string[]): void;
captureToast(type: AppToastType, message: string): string;
prepareSwalInvocation(rawArgs: any[]): any[];
```

## Alta Y Deduplicacion

Al añadir una entrada:

1. Normalizar titulo, mensaje, nivel y timestamps.
2. Construir una `dedupeKey` automatica si no se proporciona una.
3. Buscar una entrada previa con la misma clave.
4. Reutilizar su `id` si existe.
5. Reemplazar contenido y reiniciar `seenAt` a `null`.
6. Incrementar `repeatCount` cuando corresponde.
7. Ordenar por `createdAt` descendente.
8. Persistir y emitir el nuevo array.

Clave automatica usada conceptualmente:

```ts
[
    'auto',
    source,
    level,
    normalizedTitle,
    normalizedMessage,
    normalizedActionLabel,
    normalizedCountdownLabel,
].join('|');
```

Con una clave automatica, solo se incrementa `repeatCount` si coincide toda la firma. Con una `dedupeKey` explicita se permite que cambie el contenido y se considera otra aparicion del mismo evento funcional.

Ejemplo realtime:

```ts
notificationCenter.add({
    dedupeKey: `campaign-invite:${inviteId}`,
    source: 'swal',
    level: 'info',
    title: 'Invitacion de campaña',
    message: campaignName,
    actionLabel: 'Abrir campaña',
    action: () => navigation.openSocial({
        section: 'campanas',
        campaignId,
        requestId: Date.now(),
    }),
});
```

No usar el texto visible como unica identidad para eventos de polling o realtime. Usar ids funcionales.

## Vistos, Borrado Y Orden

`markSeen` debe ser selectivo y no emitir si no cambia nada:

```ts
markSeen(ids: string[]): void {
    const targetIds = new Set(ids.map((id) => `${id}`.trim()).filter(Boolean));
    const now = Date.now();
    let changed = false;

    const next = this.entriesSubject.value.map((entry) => {
        if (!targetIds.has(entry.id) || entry.seenAt !== null)
            return entry;
        changed = true;
        return { ...entry, seenAt: now };
    });

    if (changed)
        this.writeEntries(next);
}
```

La entrada mas reciente se pinta primero. Borrar una entrada no debe afectar a las demas. `clear()` vacia memoria y almacenamiento.

## Persistencia Durante 24 Horas

Se guarda solo informacion serializable:

```ts
storage.setItem(this.storageKey, JSON.stringify(entries.map((entry) => ({
    id: entry.id,
    dedupeKey: entry.dedupeKey,
    source: entry.source,
    level: entry.level,
    title: entry.title,
    message: entry.message,
    createdAt: entry.createdAt,
    seenAt: entry.seenAt,
    countdownUntil: entry.countdownUntil,
    countdownLabel: entry.countdownLabel,
    repeatCount: entry.repeatCount,
    actionLabel: entry.actionLabel,
}))));
```

Al restaurar:

- Ignorar JSON invalido.
- Ignorar entradas sin `id` o timestamp valido.
- Podar entradas con mas de 24 horas.
- Descartar countdowns que ya terminaron.
- Normalizar tipos desconocidos a `info`.
- Restaurar `action` como `null`.

### Limitacion Critica De Las Acciones

Una funcion no se puede serializar en `localStorage`. En Fichas 3.5, las entradas restauradas pierden `action` y tambien dejan de ofrecer la accion visual.

Por tanto:

- Las acciones de la campana actual solo son fiables durante la ejecucion en memoria que creo la entrada.
- Tras recargar, la entrada queda como historico informativo.
- No prometer navegabilidad durable con este modelo.

Si la otra web necesita conservar acciones tras recargar, sustituir el callback por un descriptor serializable:

```ts
export type NotificationTarget =
    | { kind: 'admin-sync' }
    | { kind: 'campaign'; campaignId: number }
    | { kind: 'conversation'; conversationId: number }
    | { kind: 'profile'; section: string };
```

La UI resolveria `target` mediante un registro de navegacion. No persistir URLs arbitrarias recibidas del backend sin validarlas.

## Captura De Toasts

El servicio de toast captura el aviso despues de emitirlo:

```ts
if (options?.captureSessionNotification !== false)
    this.notificationCenter.captureToast(type, message);
```

`captureToast` asigna titulos por tipo:

- `success`: `Accion completada`.
- `error`: `Error`.
- `system`: `Aviso del sistema`.
- `info`: `Informacion`.

Usar `captureSessionNotification: false` cuando otra fuente vaya a crear una entrada mas rica para el mismo evento. Asi se evita un toast generico y una notificacion accionable duplicados.

Los errores visibles no se filtran por preferencias sociales. Los toasts no criticos si pueden respetar categorias configurables antes de capturarse.

## Captura Global De SweetAlert2

Fichas 3.5 envuelve `Swal.fire` una sola vez al iniciar la raiz:

```ts
private configureGlobalSwal(): void {
    if (AppComponent.swalConfigured)
        return;

    const originalFire = (Swal.fire as any).bind(Swal);

    (Swal as any).fire = ((...args: any[]) => {
        const normalizedArgs = this.notificationCenter
            .prepareSwalInvocation(args);
        return originalFire(...normalizedArgs);
    }) as typeof Swal.fire;

    AppComponent.swalConfigured = true;
}
```

`prepareSwalInvocation` captura la entrada y elimina `sessionNotification` antes de entregar las opciones a SweetAlert, porque esa propiedad no forma parte de su API.

Captura automatica:

- `success`, `error` e `info` simples.
- Invocaciones por objeto o por firma `title, text, icon`.

No captura automaticamente:

- `toast: true`, para evitar duplicar el servicio de toast.
- Dialogos con `input`.
- Confirmaciones con cancelar o denegar.
- Dialogos con `showLoaderOnConfirm`.
- Dialogos con `preConfirm`.
- `warning` sin metadata explicita.

El objetivo es archivar resultados y avisos, no decisiones intermedias ni formularios.

## Metadata Explicita Para SweetAlert

Un aviso accionable o warning se incluye de forma explicita:

```ts
const openDestination = (): void => navigation.openAdminPanel('sync');

const result = await Swal.fire({
    icon: 'warning',
    title: 'Catalogos desactualizados',
    text: 'Hay sincronizaciones pendientes.',
    showCancelButton: true,
    confirmButtonText: 'Ir a sincronizacion',
    cancelButtonText: 'Luego',
    sessionNotification: {
        include: true,
        level: 'warning',
        title: 'Catalogos desactualizados',
        message: 'Hay sincronizaciones pendientes.',
        actionLabel: 'Ir a sincronizacion',
        action: openDestination,
    },
} as NotificationSwalOptions);

if (result.isConfirmed)
    openDestination();
```

Excluir un SweetAlert que normalmente seria capturado:

```ts
await Swal.fire({
    icon: 'success',
    title: 'Guardado',
    sessionNotification: false,
} as NotificationSwalOptions);
```

## Trigger De La Campana

Con Angular Material:

```html
<button
    type="button"
    class="notification-trigger"
    #notificationTrigger="matMenuTrigger"
    [matMenuTriggerFor]="notificationMenu"
    matTooltip="Notificaciones de la sesion"
    aria-label="Notificaciones de la sesion"
    (menuOpened)="onNotificationMenuOpened(notificationTrigger)"
    (menuClosed)="onNotificationMenuClosed(notificationTrigger)">
    <span class="notification-bell">
        <mat-icon>notifications</mat-icon>
        <span
            *ngIf="hasUnreadNotifications"
            class="notification-bell__dot"
            aria-hidden="true">
        </span>
    </span>
</button>
```

El punto solo expresa que existe al menos una entrada no vista. El texto accesible del boton permanece estable.

## Menu De Notificaciones

Estructura esencial:

```html
<mat-menu #notificationMenu="matMenu" xPosition="before" yPosition="below">
    <div class="notifications-menu" (click)="$event.stopPropagation()">
        <div *ngIf="notifications.length === 0" class="notifications-menu__empty">
            No hay notificaciones en esta sesion.
        </div>

        <div *ngIf="notifications.length > 0" class="notifications-menu__list">
            <div
                class="notification-entry"
                *ngFor="let entry of notifications; trackBy: trackByNotificationId"
                [class.notification-entry--actionable]="!!entry.action"
                [class.notification-entry--unseen]="entry.seenAt === null"
                [attr.role]="entry.action ? 'button' : null"
                [attr.tabindex]="entry.action ? 0 : null"
                (click)="openNotification(entry, notificationTrigger)"
                (keydown.enter)="openNotification(entry, notificationTrigger)"
                (keydown.space)="openNotification(entry, notificationTrigger); $event.preventDefault()">

                <mat-icon>{{ notificationLevelIcon(entry.level) }}</mat-icon>

                <div class="notification-entry__content">
                    <div class="notification-entry__meta">
                        <strong>{{ entry.title }}</strong>
                        <span *ngIf="entry.repeatCount > 1">x{{ entry.repeatCount }}</span>
                        <span>{{ formatNotificationTime(entry.createdAt) }}</span>
                    </div>
                    <p>{{ entry.message }}</p>
                    <span *ngIf="formatNotificationCountdown(entry) as countdown">
                        {{ countdown }}
                    </span>
                    <span *ngIf="entry.actionLabel">{{ entry.actionLabel }}</span>
                </div>

                <button
                    type="button"
                    aria-label="Borrar notificacion"
                    (click)="dismissNotification(entry.id, $event)">
                    <mat-icon>close</mat-icon>
                </button>
            </div>
        </div>

        <button
            *ngIf="notifications.length >= 2"
            type="button"
            (click)="clearNotifications($event)">
            Borrar todas
        </button>
    </div>
</mat-menu>
```

El boton de borrar debe detener propagacion para no ejecutar la accion de la fila.

## Logica Del Componente

Suscripciones:

```ts
this.entriesSub = this.notificationCenter.entries$
    .subscribe((entries) => {
        this.notifications = entries;
        this.now = Date.now();
        this.syncCountdownTimer();
        if (this.menuOpen)
            this.scheduleVisibleNotificationsSeenSync();
    });

this.unreadSub = this.notificationCenter.hasUnread$
    .subscribe((hasUnread) => this.hasUnreadNotifications = hasUnread);
```

Al abrir el menu:

1. Marcar `menuOpen = true`.
2. Actualizar `now`.
3. Iniciar el timer solo si hay countdown activo.
4. Programar el marcado de las entradas visibles como vistas.

Fichas 3.5 usa una tarea de cero milisegundos para que la apertura llegue a pintarse antes de marcar las entradas. Al cerrar se cancela esa tarea.

Accion de entrada:

```ts
async openNotification(entry: NotificationEntry, trigger?: MatMenuTrigger): Promise<void> {
    this.notificationCenter.markSeen([entry.id]);
    if (typeof entry.action !== 'function')
        return;

    trigger?.closeMenu();
    try {
        await entry.action();
    } catch {
        // Una accion fallida no debe romper la barra de navegacion.
    }
}
```

Si la accion puede fallar por una razon recuperable, es mejor que el productor muestre feedback claro que silenciar todo el error en la navbar.

## Countdown

El timer de un segundo solo funciona mientras el menu esta abierto y existe al menos un `countdownUntil` futuro. Se detiene al cerrar el menu o al terminar el ultimo countdown.

Formatos actuales:

- Segundos: `45 s`.
- Minutos: `3 min 05 s`.
- Horas: `10:01:05`.
- Dias: `2 d 03:01:05`.

Con etiqueta: `Fin de la restriccion: 10:01:05`.

No mantener un intervalo global permanentemente; es trabajo innecesario cuando la campana esta cerrada.

## Estilos Base

```scss
.notification-bell {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.notification-bell__dot {
    position: absolute;
    top: -2px;
    right: -1px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #ff6b6b;
    box-shadow: 0 0 0 2px #1f2327;
}

.notifications-menu {
    display: flex;
    flex-direction: column;
    width: min(420px, calc(100vw - 10px));
    max-width: 420px;
    max-height: min(calc(100vh - 88px), 520px);
}

.notifications-menu__list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overscroll-behavior: contain;
}

.notification-entry {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) 28px;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
}

.notification-entry--actionable {
    cursor: pointer;
}

.notification-entry--actionable:hover,
.notification-entry--actionable:focus-visible {
    background: rgba(255, 255, 255, .05);
}

.notification-entry--unseen {
    background: rgba(111, 190, 255, .07);
}

.notification-entry__content {
    min-width: 0;
}

.notification-entry__message {
    overflow-wrap: anywhere;
}
```

Adaptar colores a la otra web, pero conservar jerarquia, foco visible, ancho movil y scroll interno.

## Iconos Por Nivel

Mapeo actual:

```ts
notificationLevelIcon(level: string): string {
    if (level === 'success') return 'task_alt';
    if (level === 'error') return 'error';
    if (level === 'warning') return 'warning';
    if (level === 'system') return 'settings_suggest';
    return 'info';
}
```

No usar el color como unica señal; conservar icono, titulo y texto.

## Sesion Y Cambio De Actor

Las notificaciones pueden contener informacion privada. Al pasar de autenticado a invitado, Fichas 3.5:

- Cierra el menu.
- Cancela marcado de vistos pendiente.
- Detiene countdowns.
- Ejecuta `notificationCenter.clear()`.

Una web con cambio directo entre dos cuentas debe limpiar tambien antes de hidratar al nuevo actor. Una mejora aun mas segura es incluir el identificador del actor en la clave de almacenamiento o guardar un sobre `{ actorId, entries }` y rechazarlo si no coincide.

No guardar tokens, UIDs tecnicos innecesarios, cuerpos sensibles completos ni HTML sin sanear en `localStorage`.

## Integracion Con Realtime

Para cada evento realtime:

- Deduplicar primero por id estable del evento o entidad.
- Resolver si debe generar toast, SweetAlert, campana o una combinacion.
- Compartir la misma funcion de navegacion entre el dialogo inmediato y la entrada.
- Marcar como leido en backend antes o despues de navegar segun el contrato.
- Tratar el marcado como best-effort solo si no es requisito de consistencia.
- Respetar preferencias del usuario para avisos no criticos.

No construir destinos desde texto libre del evento. Mapear codigos conocidos a acciones tipadas.

## Pruebas Minimas

Servicio:

- Añade en orden descendente.
- Calcula no vistos y marca ids selectivos.
- No emite de nuevo si `markSeen` no cambia nada.
- Borra una entrada y conserva el resto.
- Deduplica por clave explicita y mantiene el mismo id.
- Incrementa `repeatCount` al repetirse.
- Restaura entradas validas y poda las mayores de 24 horas.
- Tolera `localStorage` no disponible o JSON corrupto.
- Excluye un SweetAlert con `sessionNotification: false`.
- Captura metadata explicita y elimina la propiedad antes de llamar a SweetAlert.

Captura:

- Toast normal crea una entrada.
- `captureSessionNotification: false` no la crea.
- SweetAlerts simples de `success`, `error` e `info` se capturan.
- Inputs, confirmaciones y loaders no se capturan automaticamente.
- Un warning navegable se captura solo con metadata explicita.

UI:

- El punto aparece con no vistos y desaparece al abrir.
- Abrir marca las entradas visibles como vistas.
- Borrar una entrada no ejecuta su accion.
- La fila es accesible con Enter y Espacio cuando tiene accion.
- La accion cierra el menu y navega.
- `Borrar todas` aparece solo cuando aporta valor.
- El countdown se actualiza y su intervalo se detiene al cerrar.
- Logout elimina las entradas actor-scoped.

## Checklist Para El Codex De La Otra Web

- [ ] Definir modelo de entrada y niveles visuales.
- [ ] Crear el servicio singleton con `BehaviorSubject`.
- [ ] Implementar deduplicacion y `repeatCount`.
- [ ] Persistir solo campos serializables y podar por antiguedad.
- [ ] Decidir expresamente si las acciones deben sobrevivir a recargas.
- [ ] Integrar el servicio de toast con opt-out.
- [ ] Integrar SweetAlert con reglas de captura y metadata explicita.
- [ ] Crear trigger, punto de no vistos y menu accesible.
- [ ] Implementar vistos, borrado individual y borrado total.
- [ ] Activar countdown solo con el menu abierto.
- [ ] Limpiar informacion actor-scoped al logout o cambio de cuenta.
- [ ] Añadir pruebas de servicio, captura, UI, persistencia y permisos.

