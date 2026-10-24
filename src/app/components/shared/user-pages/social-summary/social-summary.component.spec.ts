import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { SocialSummary } from '../../../../interfaces/chat';
import { CommunityService } from '../../../../services/entities/community.service';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { PlatformSocialService } from '../../../../services/platform/platform-social.service';
import { PlatformSpacesService } from '../../../../services/platform/platform-spaces.service';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { SocialSummaryComponent } from './social-summary.component';

describe('SocialSummaryComponent', () => {
    let fixture: ComponentFixture<SocialSummaryComponent>;
    let community: jasmine.SpyObj<CommunityService>;
    let social: jasmine.SpyObj<PlatformSocialService>;
    let spaces: jasmine.SpyObj<PlatformSpacesService>;
    const invitation = (idExterno: string) => ({ id: 1, espacio: { id: 9, idExterno, nombre: 'Club', dosPasos: false }, de: { cuenta: 'a', nombre: 'Ana' }, rol: 'miembro', caduca: '2026-11-08T00:00:00Z' });
    const summary: SocialSummary = { Parcial: false, BloquesFallidos: [], Resumen: { Clubes: { Activos: 2, InvitacionesPendientes: 0 } } };
    const relationships = { solicitudesRecibidas: 1, solicitudesEnviadas: 0, amistades: 3, seguidos: 5, seguidores: 4, bloqueos: 0 };
    const chatState = new BehaviorSubject({ accountId: 'cuenta-a', conversations: [{ NoLeidos: 2 }, { NoLeidos: 1 }], loading: false, initialized: true, error: '' });

    beforeEach(async () => {
        community = jasmine.createSpyObj<CommunityService>('CommunityService', ['socialSummary']);
        community.socialSummary.and.returnValue(of(summary));
        social = jasmine.createSpyObj<PlatformSocialService>('PlatformSocialService', ['summary']);
        social.summary.and.returnValue(of(relationships));
        const session = { socialUrl: (vista?: string) => `https://social.test/?vista=${vista}` };
        spaces = jasmine.createSpyObj<PlatformSpacesService>('PlatformSpacesService', ['myInvitations']);
        spaces.myInvitations.and.returnValue(of([invitation('club-4'), invitation('campana-2')]));
        await TestBed.configureTestingModule({
            imports: [SocialSummaryComponent],
            providers: [
                provideRouter([]),
                { provide: CommunityService, useValue: community },
                { provide: PlatformSocialService, useValue: social },
                { provide: PlatformSessionService, useValue: session },
                { provide: ChatStoreService, useValue: { state$: chatState, initialize: jasmine.createSpy('initialize') } },
                { provide: PlatformSpacesService, useValue: spaces }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(SocialSummaryComponent);
    });

    it('junta los clubes de Libros, los mensajes del chat y las relaciones de la plataforma', () => {
        fixture.detectChanges();
        const cards = fixture.componentInstance.cards;

        expect(community.socialSummary).toHaveBeenCalledTimes(1);
        expect(social.summary).toHaveBeenCalledTimes(1);
        expect(cards.map(card => card.label)).toEqual(['Amistades', 'Solicitudes de amistad', 'Seguidores', 'Siguiendo', 'Clubes activos', 'Invitaciones a clubes', 'Mensajes sin leer']);
        expect(cards.find(card => card.label === 'Mensajes sin leer')?.value).toBe(3);
        expect(cards.find(card => card.label === 'Amistades')?.href).toBe('https://social.test/?vista=amistades');
        // Las invitaciones a clubes las cuenta la plataforma (solo las de los espacios de clubes).
        expect(cards.find(card => card.label === 'Invitaciones a clubes')?.value).toBe(1);
    });

    it('lleva las relaciones a la web social con el símbolo del ecosistema', () => {
        fixture.detectChanges();
        const external = Array.from(fixture.nativeElement.querySelectorAll('a[target="_blank"]')) as HTMLAnchorElement[];

        expect(external.length).toBe(4);
        expect(external.every(link => link.querySelector('app-yosiftware-mark'))).toBeTrue();
    });

    it('si la plataforma no responde, enseña los clubes y avisa de que el resumen es parcial', () => {
        social.summary.and.returnValue(throwError(() => ({ status: 503 })));
        fixture.detectChanges();

        expect(fixture.componentInstance.partial).toBeTrue();
        expect(fixture.componentInstance.cards.map(card => card.label)).toEqual(['Clubes activos', 'Invitaciones a clubes', 'Mensajes sin leer']);
    });

    it('ignora recargas concurrentes mientras hay una petición activa', () => {
        community.socialSummary.and.returnValue(new Observable<SocialSummary>());
        fixture.componentInstance.load();
        fixture.componentInstance.load();
        expect(community.socialSummary).toHaveBeenCalledTimes(1);
    });
});
