import { of } from 'rxjs';
import { CommunityComponent } from './community.component';

describe('CommunityComponent Mobile people and composer', () => {
    function create() {
        const component = Object.create(CommunityComponent.prototype) as any;
        component.presentation = { snapshot: { isMobilePresentationActive: true } };
        component.community = jasmine.createSpyObj('CommunityService', ['users']);
        component.users = [];
        component.userSearch = '';
        component.userSearchError = '';
        component.hasSearchedUsers = false;
        component.isSearchingUsers = false;
        component.loadError = false;
        component.view = 'people';
        return component;
    }

    it('does not request or show people before a Mobile search', () => {
        const component = create();
        component.users = [{ Id: 1 }];

        component.load();

        expect(component.community.users).not.toHaveBeenCalled();
        expect(component.users).toEqual([]);
        expect(component.hasSearchedUsers).toBeFalse();
        expect(component.isLoading).toBeFalse();
    });

    it('searches only after receiving a non-empty query', () => {
        const component = create();
        const result = [{ Id: 9, Nombre: 'Lectora' }];
        component.community.users.and.returnValue(of(result));
        component.userSearch = '  lectora  ';

        component.searchUsers();

        expect(component.community.users).toHaveBeenCalledOnceWith('lectora');
        expect(component.users).toBe(result);
        expect(component.hasSearchedUsers).toBeTrue();
    });

    it('keeps a publication draft while closing its fullscreen composer', () => {
        const component = create();
        component.postContent = 'Borrador sin publicar';
        component.composerOpen = true;
        component.isPublishing = false;

        component.closeComposer();

        expect(component.composerOpen).toBeFalse();
        expect(component.postContent).toBe('Borrador sin publicar');
    });
});
