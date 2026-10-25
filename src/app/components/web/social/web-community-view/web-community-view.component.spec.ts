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

    it('traduce la pertenencia y el rol de un club', () => {
        const component = create({});

        expect(component.membershipLabel('miembro')).toBe('ya eres miembro');
        expect(component.roleLabel('moderador')).toBe('Moderador');
        expect(component.roleLabel('desconocido')).toBe('desconocido');
    });
});
