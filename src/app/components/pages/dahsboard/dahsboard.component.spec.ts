import { BehaviorSubject, Subject } from 'rxjs';
import { CommunityCapabilitiesResponse, CommunityCapabilityId } from '../../../interfaces/community-capabilities';
import { DahsboardComponent } from './dahsboard.component';

describe('DahsboardComponent', () => {
    it('inicializa chat una sola vez cuando la capacidad llega después de montar la vista', () => {
        const capabilityState = new BehaviorSubject<CommunityCapabilitiesResponse>(capabilities(false));
        let chatActive = false;
        const capabilitiesService = {
            state$: capabilityState.asObservable(),
            isActive: jasmine.createSpy().and.callFake(() => chatActive)
        };
        const chatStore = { initialize: jasmine.createSpy(), clear: jasmine.createSpy() };
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
