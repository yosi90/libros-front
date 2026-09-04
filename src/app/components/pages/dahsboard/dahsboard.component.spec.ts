import { BehaviorSubject, Subject } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { CommunityCapabilitiesResponse, CommunityCapabilityId } from '../../../interfaces/community-capabilities';
import { DahsboardComponent } from './dahsboard.component';
import { RealtimeConnectionStates } from '../../../services/realtime/realtime-socket.service';

describe('DahsboardComponent', () => {
    it('mantiene el store de chat activo en presentación Mobile para publicar los no leídos', () => {
        const capabilityState = new BehaviorSubject<CommunityCapabilitiesResponse>(capabilities(true));
        const chatStore = { state$: new BehaviorSubject({ conversations: [{ NoLeidos: 3 }, { NoLeidos: 2 }] }), initialize: jasmine.createSpy(), clear: jasmine.createSpy() };
        const component = new DahsboardComponent(
            { userId: 7 } as never,
            {} as never,
            { status$: new BehaviorSubject({ chat: 'idle', community: 'idle' }), retry: jasmine.createSpy() } as never,
            { state$: new BehaviorSubject(null), accountRestrictionMessage: jasmine.createSpy() } as never,
            { state$: capabilityState.asObservable(), isActive: jasmine.createSpy().and.returnValue(true) } as never,
            chatStore as never,
            { initialize: jasmine.createSpy(), closeAll: jasmine.createSpy(), clear: jasmine.createSpy(), handleViewportChange: jasmine.createSpy() } as never,
            {} as never,
            {} as never,
            {} as never,
            { events: new Subject() } as never,
            {
                state$: new BehaviorSubject({ isWoodPresentationActive: false, isMobilePresentationActive: true }),
                snapshot: { isWoodPresentationActive: false, isMobilePresentationActive: true, isNativeMobile: true, canUseDesktopAdministration: false }
            } as never
        );
        let unread = 0;
        const subscription = component.unreadChatCount$.subscribe(value => unread = value);

        component.ngOnInit();

        expect(chatStore.initialize).toHaveBeenCalledOnceWith(7);
        expect(unread).toBe(5);
        subscription.unsubscribe();
        component.ngOnDestroy();
    });

    it('oculta reconexiones nativas breves y muestra una caída sostenida tras la gracia', fakeAsync(() => {
        const realtimeStates = new BehaviorSubject<RealtimeConnectionStates>({ chat: 'idle', community: 'idle' });
        const capabilityState = new BehaviorSubject<CommunityCapabilitiesResponse>(capabilities(false));
        const component = new DahsboardComponent(
            { userId: 7 } as never,
            {} as never,
            { status$: realtimeStates.asObservable(), retry: jasmine.createSpy() } as never,
            { state$: new BehaviorSubject(null), accountRestrictionMessage: jasmine.createSpy() } as never,
            { state$: capabilityState.asObservable(), isActive: jasmine.createSpy().and.returnValue(false) } as never,
            { state$: new BehaviorSubject({ conversations: [] }), initialize: jasmine.createSpy(), clear: jasmine.createSpy() } as never,
            { initialize: jasmine.createSpy(), closeAll: jasmine.createSpy(), clear: jasmine.createSpy(), handleViewportChange: jasmine.createSpy() } as never,
            {} as never,
            {} as never,
            {} as never,
            { events: new Subject() } as never,
            {
                state$: new BehaviorSubject({ isWoodPresentationActive: false, isMobilePresentationActive: true }),
                snapshot: { isWoodPresentationActive: false, isMobilePresentationActive: true, isNativeMobile: true, canUseDesktopAdministration: false }
            } as never
        );
        const emitted: Array<Record<string, string>> = [];
        const subscription = component.realtimeStatus$.subscribe(states => emitted.push(states));

        realtimeStates.next({ chat: 'reconnecting', community: 'idle' });
        tick(1200);
        expect(emitted.at(-1)?.['chat']).toBe('idle');

        realtimeStates.next({ chat: 'connected', community: 'idle' });
        expect(emitted.at(-1)?.['chat']).toBe('connected');

        realtimeStates.next({ chat: 'offline', community: 'idle' });
        tick(1799);
        expect(emitted.at(-1)?.['chat']).toBe('connected');
        tick(1);
        expect(emitted.at(-1)?.['chat']).toBe('offline');

        subscription.unsubscribe();
        component.ngOnDestroy();
    }));

    it('inicializa chat una sola vez cuando la capacidad llega después de montar la vista', () => {
        const capabilityState = new BehaviorSubject<CommunityCapabilitiesResponse>(capabilities(false));
        let chatActive = false;
        const capabilitiesService = {
            state$: capabilityState.asObservable(),
            isActive: jasmine.createSpy().and.callFake(() => chatActive)
        };
        const chatStore = { state$: new BehaviorSubject({ conversations: [] }), initialize: jasmine.createSpy(), clear: jasmine.createSpy() };
        const chatFloating = { initialize: jasmine.createSpy(), closeAll: jasmine.createSpy(), clear: jasmine.createSpy(), handleViewportChange: jasmine.createSpy() };
        const moderationAccess = { state$: new BehaviorSubject(null), accountRestrictionMessage: jasmine.createSpy() };
        const presentation = {
            state$: new BehaviorSubject({ isWoodPresentationActive: true, isMobilePresentationActive: false }),
            snapshot: { isWoodPresentationActive: true, isMobilePresentationActive: false, canUseDesktopAdministration: true }
        };
        const component = new DahsboardComponent(
            { userId: 7 } as never,
            {} as never,
            { status$: new BehaviorSubject({ chat: 'idle', community: 'idle' }), retry: jasmine.createSpy() } as never,
            moderationAccess as never,
            capabilitiesService as never,
            chatStore as never,
            chatFloating as never,
            {} as never,
            {} as never,
            {} as never,
            { events: new Subject() } as never,
            presentation as never
        );

        expect(component.isWoodPresentation).toBeTrue();
        expect(component.isMobilePresentation).toBeFalse();

        component.ngOnInit();
        expect(chatStore.initialize).not.toHaveBeenCalled();

        chatActive = true;
        capabilityState.next(capabilities(true));
        capabilityState.next(capabilities(true));

        expect(chatStore.initialize).toHaveBeenCalledOnceWith(7);

        chatActive = false;
        capabilityState.next(capabilities(false));
        expect(chatStore.clear).toHaveBeenCalledTimes(1);
        expect(chatFloating.closeAll).toHaveBeenCalled();
        component.ngOnDestroy();
    });
});

function capabilities(active: boolean): CommunityCapabilitiesResponse {
    const ids: CommunityCapabilityId[] = ['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes'];
    return {
        UsuarioId: 7,
        VersionConfiguracion: 1,
        VersionCliente: 'test',
        FechaExpiracion: null,
        CacheTtlSegundos: 300,
        Conservadora: !active,
        Capacidades: ids.reduce((all, id) => ({ ...all, [id]: { Activa: active, VersionMinima: null } }), {} as CommunityCapabilitiesResponse['Capacidades'])
    };
}
