import { of } from 'rxjs';
import { CommunityComponent } from './community.component';

describe('CommunityComponent (clubes)', () => {
    function create(queryTab: string | null = null) {
        const community = jasmine.createSpyObj('CommunityService', ['discoverClubs', 'clubSocialSummary', 'myClubs', 'myUpcomingClubEvents', 'createClub']);
        community.discoverClubs.and.returnValue(of({ Clubes: [{ Id: 3 }], SiguienteCursor: null }));
        community.clubSocialSummary.and.returnValue(of({
            TieneClubes: false, ClubesPropios: [], ProximosEventos: [], ClubesPublicosActivos: [],
            BandejasAcceso: { Solicitudes: { EnviadasPendientes: 1, RecibidasPendientes: 0 }, Invitaciones: { EnviadasPendientes: 0, RecibidasPendientes: 2 } }
        }));
        const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
        const route = { snapshot: { queryParamMap: { get: () => queryTab } } };
        const access = { refresh: () => of(null), canUse: () => true, restrictionMessage: () => null };
        const universes = { getAllBooks: () => [{ Id: 1 }] };
        const component = new CommunityComponent(community, router as never, route as never, universes as never, access as never, { snapshot: {} } as never);
        return { component, community, router };
    }

    it('carga solo los clubes: sin muro general ni búsqueda de personas', () => {
        const { component, community } = create();
        component.ngOnInit();

        expect(component.view).toBe('clubs');
        expect(community.discoverClubs).toHaveBeenCalledOnceWith({ query: '' });
        expect(component.clubs.length).toBe(1);
        expect(component.clubAccessPendingTotal).toBe(3);
        expect(component.isLoading).toBeFalse();
    });

    it('no abre «Mis clubes» sin clubes y vuelve a descubrir', () => {
        const { component, router } = create('mine');
        component.ngOnInit();

        expect(component.clubTab).toBe('discover');
        expect(router.navigate).toHaveBeenCalled();
    });
});
