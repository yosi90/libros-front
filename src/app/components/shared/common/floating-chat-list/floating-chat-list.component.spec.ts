import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ChatConversation } from '../../../../interfaces/chat';
import { CommunityUser } from '../../../../interfaces/community';
import { FloatingChatListComponent } from './floating-chat-list.component';

describe('FloatingChatListComponent', () => {
    const conversations: ChatConversation[] = [
        { Id: 1, Tipo: 'directa', Titulo: 'Directo', ClubId: null, FechaUltimoMensaje: null, NoLeidos: 0 },
        { Id: 2, Tipo: 'grupo', Titulo: 'Grupo', ClubId: null, FechaUltimoMensaje: null, NoLeidos: 0 }
    ];
    const availableUser: CommunityUser = { Id: 7, Nombre: 'Yosi', Imagen: null, Username: 'yosi', DisplayName: 'Yosi', Bio: null, PaisCodigo: null, PermitirMensajes: true };

    function setup() {
        const state$ = new BehaviorSubject({ actorId: 1, conversations, loading: false, initialized: true, error: '' });
        const store = { state$, initialize: jasmine.createSpy(), refresh: jasmine.createSpy() };
        const floating = { openConversation: jasmine.createSpy() };
        const community = { users: jasmine.createSpy().and.returnValue(of([availableUser, { ...availableUser, Id: 8, PermitirMensajes: false }])) };
        const chat = { createDirectConversation: jasmine.createSpy().and.returnValue(of(21)) };
        const component = new FloatingChatListComponent(store as never, { userId: 1 } as never, floating as never, community as never, chat as never);
        component.ngOnInit();
        return { component, store, floating, community, chat };
    }

    it('aplica los filtros rápidos sobre el listado compartido', () => {
        const { component } = setup();
        expect(component.filteredConversations.length).toBe(2);
        component.filter = 'grupo';
        expect(component.filteredConversations).toEqual([conversations[1]]);
        component.ngOnDestroy();
    });

    it('busca desde dos caracteres y conserva solo usuarios que aceptan directos', fakeAsync(() => {
        const { component, community } = setup();
        component.userQuery = 'y';
        component.onUserQueryChange();
        tick(300);
        expect(community.users).not.toHaveBeenCalled();

        component.userQuery = 'yo';
        component.onUserQueryChange();
        tick(300);
        expect(community.users).toHaveBeenCalledOnceWith('yo');
        expect(component.users).toEqual([availableUser]);
        component.ngOnDestroy();
    }));

    it('crea el directo y lo abre como conversación flotante', () => {
        const { component, store, floating, chat } = setup();
        component.creatorOpen = true;
        component.startDirect(availableUser);
        expect(chat.createDirectConversation).toHaveBeenCalledOnceWith(availableUser.Id);
        expect(store.refresh).toHaveBeenCalledOnceWith(true);
        expect(floating.openConversation).toHaveBeenCalledOnceWith(21);
        expect(component.creatorOpen).toBeFalse();
        component.ngOnDestroy();
    });
});
