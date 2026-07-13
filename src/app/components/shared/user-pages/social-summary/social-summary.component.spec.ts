import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { SocialSummary } from '../../../../interfaces/chat';
import { CommunityService } from '../../../../services/entities/community.service';
import { SocialSummaryComponent } from './social-summary.component';

describe('SocialSummaryComponent', () => {
    let fixture: ComponentFixture<SocialSummaryComponent>;
    let community: jasmine.SpyObj<CommunityService>;
    const summary: SocialSummary = {
        Parcial: false,
        BloquesFallidos: [],
        Resumen: {
            Relaciones: { Amistades: 3, SolicitudesRecibidasPendientes: 1, Seguidores: 4, Seguidos: 5 },
            Clubes: { Activos: 2, InvitacionesPendientes: 0 },
            Mensajes: { NoLeidos: 3, NoLeidosHumanos: 1, NoLeidosSistema: 2 }
        }
    };

    beforeEach(async () => {
        community = jasmine.createSpyObj<CommunityService>('CommunityService', ['socialSummary']);
        community.socialSummary.and.returnValue(of(summary));
        await TestBed.configureTestingModule({ imports: [SocialSummaryComponent], providers: [provideRouter([]), { provide: CommunityService, useValue: community }] }).compileComponents();
        fixture = TestBed.createComponent(SocialSummaryComponent);
    });

    it('carga una sola vez y conserva tarjetas y enlaces entre detecciones de cambios', () => {
        fixture.detectChanges();
        const firstCards = fixture.componentInstance.cards;
        const firstLinks = Array.from(fixture.nativeElement.querySelectorAll('a'));
        fixture.detectChanges();
        const secondLinks = Array.from(fixture.nativeElement.querySelectorAll('a'));

        expect(community.socialSummary).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.cards).toBe(firstCards);
        expect(firstCards.length).toBe(8);
        expect(secondLinks).toEqual(firstLinks);
    });

    it('ignora recargas concurrentes mientras hay una petición activa', () => {
        community.socialSummary.and.returnValue(new Observable<SocialSummary>());
        fixture.componentInstance.load();
        fixture.componentInstance.load();
        expect(community.socialSummary).toHaveBeenCalledTimes(1);
    });
});
