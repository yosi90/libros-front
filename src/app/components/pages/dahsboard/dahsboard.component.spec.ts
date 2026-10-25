import { BehaviorSubject, Subject } from 'rxjs';
import { DahsboardComponent } from './dahsboard.component';

describe('DahsboardComponent', () => {
    function create(presentationSnapshot: Record<string, unknown>) {
        const chatStore = { state$: new BehaviorSubject({ conversations: [{ NoLeidos: 3 }, { NoLeidos: 2 }] }), initialize: jasmine.createSpy('initialize'), clear: jasmine.createSpy('clear') };
        const chatFloating = { initialize: jasmine.createSpy('initialize'), closeAll: jasmine.createSpy('closeAll'), clear: jasmine.createSpy('clear'), handleViewportChange: jasmine.createSpy('handleViewportChange'), isInitialized: false };
        const component = new DahsboardComponent(
            { userId: 7 } as never,
            { state$: new BehaviorSubject(null), accountRestrictionMessage: jasmine.createSpy() } as never,
            { state$: new BehaviorSubject(null), isActive: jasmine.createSpy().and.returnValue(true) } as never,
            chatStore as never,
            chatFloating as never,
            { events: new Subject() } as never,
            { state$: new BehaviorSubject(presentationSnapshot), snapshot: presentationSnapshot } as never
        );
        return { component, chatStore, chatFloating };
    }

    it('arranca la bandeja del chat de la plataforma con cualquier sesión y publica los no leídos', () => {
        const { component, chatStore } = create({ isWoodPresentationActive: false, isMobilePresentationActive: true, isNativeMobile: true });
        let unread = 0;
        const subscription = component.unreadChatCount$.subscribe(value => unread = value);

        component.ngOnInit();

        expect(chatStore.initialize).toHaveBeenCalledTimes(1);
        expect(component.chatEnabled).toBeTrue();
        expect(component.communityEnabled).toBeTrue();
        expect(unread).toBe(5);
        subscription.unsubscribe();
        component.ngOnDestroy();
        expect(chatStore.clear).toHaveBeenCalled();
    });

    it('prepara las ventanas flotantes en el escritorio de Wood y Web, y no en Mobile', () => {
        const wood = create({ isWoodPresentationActive: true, isMobilePresentationActive: false });
        wood.component.ngOnInit();
        expect(wood.chatFloating.initialize).toHaveBeenCalledOnceWith(7);
        wood.component.ngOnDestroy();

        const mobile = create({ isWoodPresentationActive: false, isMobilePresentationActive: true });
        mobile.component.ngOnInit();
        expect(mobile.chatFloating.initialize).not.toHaveBeenCalled();
        mobile.component.ngOnDestroy();
    });
});
