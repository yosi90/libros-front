import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ChatConversation, ChatFriendship, ChatPerson } from '../../../../interfaces/chat';
import { FloatingChatListComponent } from './floating-chat-list.component';

describe('FloatingChatListComponent', () => {
    const conversation = (Id: number, Tipo: ChatConversation['Tipo'], Titulo: string): ChatConversation => ({
        Id, Tipo, Titulo, Web: null, FechaUltimoMensaje: null, NoLeidos: 0, PuedeEnviar: true, RolParticipante: 'miembro', Cerrada: false,
        Miembros: 2, Contraparte: null, UltimoMensaje: null, Permisos: { Escribir: true, Invitar: false, Administrar: false, Salir: true }
    });
    const conversations: ChatConversation[] = [conversation(1, 'directa', 'Directo'), conversation(2, 'grupo', 'Grupo'), conversation(3, 'web', 'Club de Dune')];
    const yosi: ChatPerson = { Id: 'cuenta-yosi', Alias: 'yosi', Nombre: 'Yosi', Imagen: null, Borrada: false };
    const ana: ChatPerson = { Id: 'cuenta-ana', Alias: 'ana', Nombre: 'Ana', Imagen: null, Borrada: false };
    const friendships: ChatFriendship[] = [{ Usuario: ana }, { Usuario: yosi }];

    function setup() {
        const state$ = new BehaviorSubject({ accountId: 'cuenta-yo', conversations, loading: false, initialized: true, error: '' });
        const store = { state$, initialize: jasmine.createSpy(), refresh: jasmine.createSpy() };
        const floating = { openConversation: jasmine.createSpy() };
        const chat = {
            friendships: jasmine.createSpy().and.returnValue(of(friendships)),
            createDirectConversation: jasmine.createSpy().and.returnValue(of(21)),
            createGroup: jasmine.createSpy().and.returnValue(of(30))
        };
        const component = new FloatingChatListComponent(store as never, floating as never, chat as never);
        component.ngOnInit();
        return { component, store, floating, chat };
    }

    it('aplica los filtros rápidos sobre la bandeja de la plataforma (los clubes son conversaciones de la web)', () => {
        const { component, store } = setup();
        expect(store.initialize).toHaveBeenCalled();
        expect(component.filteredConversations.length).toBe(3);
        component.filter = 'grupo';
        expect(component.filteredConversations).toEqual([conversations[1]]);
        component.filter = 'club';
        expect(component.filteredConversations).toEqual([conversations[2]]);
        expect(component.filters.map(item => item.id)).not.toContain('sistema' as never);
        component.ngOnDestroy();
    });

    it('busca desde dos caracteres y solo entre amistades (las directas son entre amistades)', fakeAsync(() => {
        const { component, chat } = setup();
        component.userQuery = 'y';
        component.onUserQueryChange();
        tick(300);
        expect(chat.friendships).not.toHaveBeenCalled();

        component.userQuery = 'yo';
        component.onUserQueryChange();
        tick(300);
        expect(chat.friendships).toHaveBeenCalledTimes(1);
        expect(component.users).toEqual([yosi]);
        component.ngOnDestroy();
    }));

    it('crea el directo con la cuenta de la amistad y lo abre como conversación flotante', () => {
        const { component, store, floating, chat } = setup();
        component.creatorOpen = true;
        component.startDirect(yosi);
        expect(chat.createDirectConversation).toHaveBeenCalledOnceWith('cuenta-yosi');
        expect(store.refresh).toHaveBeenCalledOnceWith(true);
        expect(floating.openConversation).toHaveBeenCalledOnceWith(21);
        expect(component.creatorOpen).toBeFalse();
        component.ngOnDestroy();
    });

    it('propone para un grupo solo amistades e invita por su cuenta', () => {
        const { component, chat, floating } = setup();
        component.openCreator('group');
        expect(component.groupCandidates.map(item => item.UsuarioId)).toEqual(['cuenta-ana', 'cuenta-yosi']);
        component.groupQuery = 'an';
        component.onGroupQueryChange();
        expect(component.groupCandidates.map(item => item.Nombre)).toEqual(['Ana']);
        component.groupTitle = 'Lectores';
        component.toggleParticipant('cuenta-ana');
        component.createGroup();
        expect(chat.createGroup).toHaveBeenCalledOnceWith('Lectores', ['cuenta-ana']);
        expect(floating.openConversation).toHaveBeenCalledOnceWith(30);
        component.ngOnDestroy();
    });
});
