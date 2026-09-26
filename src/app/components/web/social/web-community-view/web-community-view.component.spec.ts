import type { CommunityComponent } from '../../../shared/user-pages/community/community.component';
import { WebCommunityViewComponent } from './web-community-view.component';

describe('WebCommunityViewComponent', () => {
    function create(controller: Partial<CommunityComponent>) {
        const component = new WebCommunityViewComponent();
        component.controller = controller as CommunityComponent;
        return component;
    }

    it('muestra la inicial del nombre como avatar', () => {
        const component = create({});

        expect(component.initial('lectora')).toBe('L');
        expect(component.initial('  ')).toBe('?');
        expect(component.initial(null)).toBe('?');
    });

    it('traduce la audiencia de la publicación', () => {
        const component = create({});

        expect(component.audienceLabel('amigos')).toBe('Amigos');
        expect(component.audienceLabel('desconocida')).toBe('desconocida');
    });

    it('cierra el diálogo de publicación con Escape salvo mientras publica', () => {
        const closeComposer = jasmine.createSpy('closeComposer');
        create({ composerOpen: true, isPublishing: true, closeComposer } as Partial<CommunityComponent>).closeComposerOnEscape();
        expect(closeComposer).not.toHaveBeenCalled();

        create({ composerOpen: true, isPublishing: false, closeComposer } as Partial<CommunityComponent>).closeComposerOnEscape();
        expect(closeComposer).toHaveBeenCalled();
    });
});
