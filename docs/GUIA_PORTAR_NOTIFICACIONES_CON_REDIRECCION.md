# Guia Para Portar Notificaciones Con Redireccion

## Objetivo

Esta guia esta pensada para el Codex de otra web. Documenta el patron usado en Fichas 3.5 para mostrar un aviso accionable y llevar al usuario directamente a la superficie que puede resolverlo.

El ejemplo principal es el aviso de catalogos desactualizados para administradores:

1. Se detecta que existe al menos una cache pendiente.
2. Se muestra un `SweetAlert2` con una accion principal.
3. Si el usuario confirma, se abre `Panel admin` directamente en `Sincronizacion`.
4. La pantalla destino recibe una peticion tipada y activa la seccion solicitada.

Este sistema no es la campana de notificaciones. Puede integrarse con ella mediante metadata adicional, pero la redireccion debe funcionar aunque la campana no exista.

## Idea Central

No acoplar el productor del aviso al componente destino.

El flujo se divide en cuatro responsabilidades:

```text
Detector de condicion
        |
        v
Aviso accionable (SweetAlert, dialogo o banner)
        |
        v
Servicio de navegacion / command bus
        |
        v
Contenedor que abre la superficie -> pantalla que selecciona la seccion
```

En una aplicacion con rutas reales, el servicio de navegacion puede envolver `Router.navigate`. En Fichas 3.5 se usa un bus RxJS porque las superficies principales se abren como tabs internas y no como rutas.

## Archivos De Referencia En Fichas 3.5

- `src/app/components/base/tab-control/tab-control.component.ts`
  - Detecta caches pendientes en `verificarPendientesCacheAdminEnInicio()`.
  - Ejecuta la redireccion local en `irAlPanelAdministracion('sync')`.
  - Consume peticiones globales de `UserProfileNavigationService`.
- `src/app/services/user-profile-navigation.service.ts`
  - Bus de navegacion desacoplado basado en `Subject`.
- `src/app/interfaces/user-account.ts`
  - Define `AdminPanelSectionId` y `AdminPanelOpenRequest`.
- `src/app/components/base/admin-panel/admin-panel.component.ts`
  - Recibe `@Input() openRequest` y aplica la seccion en `ngOnChanges`.
- `src/app/services/manual-flag-consistency-notice.service.ts`
  - Ejemplo reutilizable de aviso que navega desde un servicio.
- `src/app/services/admin-role-request-notifier.service.ts`
  - Ejemplo de redireccion con parametros adicionales y trabajo previo a la navegacion.
- `src/app/services/compliance-policy-notice.service.ts`
  - Ejemplo de aviso actor-scoped que abre una seccion de perfil.

## Contrato De Navegacion

La peticion debe ser tipada, expresar el destino funcional y llevar un identificador nuevo en cada apertura.

```ts
export type AdminPanelSectionId =
    | 'usuarios'
    | 'role-requests'
    | 'feedback-bugs'
    | 'feedback-features'
    | 'moderacion'
    | 'auditoria'
    | 'sync';

export interface AdminPanelOpenRequest {
    section: AdminPanelSectionId;
    pendingOnly?: boolean;
    requestId: number;
}
```

`requestId` no identifica una entidad de negocio. Es una revision de la orden de apertura. Permite que Angular detecte y vuelva a aplicar dos ordenes consecutivas dirigidas a la misma seccion.

En otra web conviene usar un contador monotono o `crypto.randomUUID()` si varias ordenes pueden producirse en el mismo milisegundo.

## Bus De Navegacion

Version reducida del patron actual:

```ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WorkspaceNavigationService {
    private readonly adminPanelSubject = new Subject<AdminPanelOpenRequest>();

    readonly adminPanelOpen$: Observable<AdminPanelOpenRequest> =
        this.adminPanelSubject.asObservable();

    openAdminPanel(
        request?: AdminPanelOpenRequest | AdminPanelSectionId
    ): void {
        if (typeof request === 'string') {
            this.adminPanelSubject.next({
                section: request,
                requestId: Date.now(),
            });
            return;
        }

        this.adminPanelSubject.next({
            section: request?.section ?? 'usuarios',
            pendingOnly: request?.pendingOnly === true,
            requestId: Number(request?.requestId) > 0
                ? Number(request?.requestId)
                : Date.now(),
        });
    }
}
```

Reglas:

- El productor solo conoce el destino funcional, no el arbol de componentes.
- El servicio normaliza defaults y valores opcionales.
- No exponer el `Subject`; publicar solo el `Observable`.
- No poner comprobaciones visuales en el bus. Los permisos deben validarse tambien en el consumidor y en backend.
- Si la web usa Angular Router, mantener el mismo contrato y traducirlo a `router.navigate(['/admin'], { queryParams: { section: 'sync' } })`.

## Consumidor En El Contenedor Principal

El contenedor que controla las tabs se suscribe una vez y destruye la suscripcion con el componente:

```ts
private readonly destroy$ = new Subject<void>();

ngOnInit(): void {
    this.workspaceNavigation.adminPanelOpen$
        .pipe(takeUntil(this.destroy$))
        .subscribe((request) => this.openAdminPanel(request));
}

ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
}

openAdminPanel(request: AdminPanelOpenRequest): void {
    if (!this.canAccessAdminPanel)
        return;

    this.adminPanelOpenRequest = {
        section: request?.section ?? 'usuarios',
        pendingOnly: request?.pendingOnly === true,
        requestId: Number(request?.requestId) > 0
            ? Number(request.requestId)
            : Date.now(),
    };

    this.adminPanelTabOpen = true;
    this.focusTab('admin');
}
```

El template entrega la orden a la pantalla destino:

```html
<app-admin-panel
    *ngIf="adminPanelTabOpen"
    [openRequest]="adminPanelOpenRequest">
</app-admin-panel>
```

La pantalla aplica cada nueva peticion:

```ts
@Input() openRequest: AdminPanelOpenRequest | null = null;

ngOnChanges(changes: SimpleChanges): void {
    if (changes['openRequest']?.currentValue)
        this.applyOpenRequest(changes['openRequest'].currentValue);
}

private applyOpenRequest(request: AdminPanelOpenRequest): void {
    const section = this.isKnownSection(request.section)
        ? request.section
        : 'usuarios';

    this.currentSection = section;
    this.showPendingOnly = section === 'role-requests'
        && request.pendingOnly === true;
    void this.ensureSectionLoaded(section);
}
```

Es importante que la pantalla destino cargue la seccion pedida aunque la tab ya estuviera abierta. Abrir o enfocar la tab no sustituye a aplicar la orden.

## Ejemplo: Catalogos Desactualizados

La implementacion actual comprueba metadata de cache al disponer de permisos admin y despues de inicializar la vista de tabs.

Estado minimo para evitar duplicados y carreras:

```ts
private warningShown = false;
private warningInFlight = false;
```

Detector y aviso:

```ts
private async checkPendingCatalogsOnStart(): Promise<void> {
    if (!this.isAdmin || this.warningShown || this.warningInFlight)
        return;

    this.warningInFlight = true;
    try {
        const snapshot = await this.cacheMetadata.getSnapshotOnce();
        const state = this.cacheMetadata.buildUiState(snapshot);
        const hasPending = state.some((item) => item.isPrimary);

        if (!hasPending)
            return;

        this.warningShown = true;
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Hay catalogos desactualizados',
            text: 'Se detectaron sincronizaciones pendientes en el panel de administracion.',
            showCancelButton: true,
            confirmButtonText: 'Ir al panel',
            cancelButtonText: 'Luego',
        });

        if (result.isConfirmed)
            this.workspaceNavigation.openAdminPanel('sync');
    } catch {
        // Fallar al comprobar el estado no debe bloquear el arranque.
    } finally {
        this.warningInFlight = false;
    }
}
```

En Fichas 3.5 existe una excepcion funcional: `manual_flag_mismatch` se avisa por su propio flujo y no debe duplicar el aviso general de caches.

El flag `warningShown` se marca cuando el aviso llega a mostrarse, incluso si el usuario elige `Luego`. Asi no se hostiga al usuario durante la misma vida del componente. Si la lectura falla, no se marca y una comprobacion posterior puede reintentarlo.

## Aviso Reutilizable Desde Un Servicio

Cuando el detector no vive en el contenedor, encapsular la alerta y usar el bus:

```ts
@Injectable({ providedIn: 'root' })
export class CatalogWarningService {
    private readonly handledKeys = new Set<string>();

    constructor(private navigation: WorkspaceNavigationService) {}

    async notifyIfNeeded(key: string, message: string): Promise<void> {
        if (this.handledKeys.has(key))
            return;

        this.handledKeys.add(key);
        const openDestination = (): void =>
            this.navigation.openAdminPanel('sync');

        const result = await Swal.fire({
            icon: 'info',
            title: 'Catalogo desincronizado',
            text: message,
            showCancelButton: true,
            confirmButtonText: 'Ir al panel',
            cancelButtonText: 'Luego',
        });

        if (result.isConfirmed)
            openDestination();
    }
}
```

Si el aviso debe quedar ademas en la campana, reutilizar la misma funcion `openDestination` en la metadata de captura:

```ts
const result = await Swal.fire({
    icon: 'warning',
    title: 'Catalogos desactualizados',
    text: message,
    showCancelButton: true,
    confirmButtonText: 'Ir al panel',
    cancelButtonText: 'Luego',
    sessionNotification: {
        include: true,
        level: 'warning',
        title: 'Catalogos desactualizados',
        message,
        actionLabel: 'Ir al panel',
        action: openDestination,
    },
} as SessionNotificationSwalOptions);
```

No duplicar la logica de navegacion entre el boton del dialogo y la campana. Ambos deben invocar la misma funcion.

## Trabajo Previo A La Redireccion

Algunos avisos necesitan confirmar estado antes de navegar. Por ejemplo, una notificacion realtime puede marcar una conversacion como leida y despues abrir una solicitud concreta.

```ts
const openRoleRequests = async (): Promise<void> => {
    await this.markNotificationAsReadBestEffort();
    this.navigation.openAdminPanel({
        section: 'role-requests',
        pendingOnly: true,
        requestId: Date.now(),
    });
};
```

Si el trabajo previo es auxiliar, capturar su error internamente para no impedir la navegacion. Si es un requisito de seguridad, abortar y mostrar un error claro.

## Permisos Y Ciclo De Vida

- Comprobar permisos antes de detectar o mostrar el aviso para no filtrar informacion.
- Volver a comprobar permisos en el contenedor antes de abrir el destino.
- Backend sigue siendo la autoridad final; ocultar tabs no sustituye a autorizacion HTTP.
- Reiniciar deduplicadores actor-scoped al cerrar sesion.
- Desuscribir observables con `takeUntil` o `DestroyRef`.
- No bloquear el arranque si falla una comprobacion secundaria.
- Si la orden puede llegar antes de que la vista destino este lista, conservar el ultimo `openRequest` y aplicarlo al montar el componente.

Fichas 3.5 reintenta algunas aperturas locales con tareas programadas porque su workspace historico usa tabs imperativas. No copiar esos `setTimeout` por defecto. En una arquitectura nueva es preferible conservar estado declarativo o navegar por Router.

## Accesibilidad Y Copy

- La accion debe nombrar el destino: `Ir a sincronizacion`, `Revisar solicitud`, `Abrir perfil`.
- Evitar `Aceptar` si el boton realmente navega.
- Mantener una alternativa no destructiva como `Luego` o `Cerrar`.
- No abrir una superficie distinta a la prometida por el CTA.
- El mensaje explica que ocurre y donde se resuelve; no debe exponer errores tecnicos.

## Pruebas Minimas

Servicio de navegacion:

- Emite la seccion solicitada.
- Completa defaults y genera un `requestId` valido.
- Conserva parametros como `pendingOnly` o el id de entidad.

Detector:

- No muestra el aviso sin permisos.
- No muestra el aviso si no hay pendientes.
- No duplica avisos mientras hay uno abierto.
- No repite el aviso despues de elegir `Luego` durante la misma sesion de UI.
- Permite reintentar si fallo la lectura previa.
- La confirmacion emite el destino correcto.

Contenedor y destino:

- Abre y enfoca la superficie si estaba cerrada.
- Cambia de seccion si ya estaba abierta.
- Rechaza la apertura si se perdieron permisos.
- Aplica dos ordenes consecutivas a la misma seccion.
- Carga los datos de la seccion solicitada.

## Checklist Para El Codex De La Otra Web

- [ ] Identificar si la navegacion real usa Router, tabs internas o ambas.
- [ ] Definir destinos y peticiones tipadas.
- [ ] Crear un servicio de navegacion desacoplado.
- [ ] Conectar el contenedor principal al servicio.
- [ ] Hacer que la pantalla destino aplique peticiones nuevas aunque ya este abierta.
- [ ] Implementar flags de `shown` e `inFlight` en cada detector.
- [ ] Validar permisos en productor, consumidor y backend.
- [ ] Compartir una sola funcion entre CTA inmediato y accion de campana.
- [ ] Probar confirmacion, `Luego`, errores de lectura y apertura repetida.

