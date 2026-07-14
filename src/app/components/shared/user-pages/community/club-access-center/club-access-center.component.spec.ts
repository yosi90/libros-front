import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClubAccessCenterComponent } from './club-access-center.component';
import { CommunityService } from '../../../../../services/entities/community.service';
import { ActivatedRoute, Router } from '@angular/router';

describe('ClubAccessCenterComponent', () => {
    let fixture: ComponentFixture<ClubAccessCenterComponent>;
    let component: ClubAccessCenterComponent;
    let community: jasmine.SpyObj<CommunityService>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        community = jasmine.createSpyObj<CommunityService>('CommunityService', [
            'ownClubJoinRequests', 'clubInvitations', 'cancelOwnClubJoinRequest',
            'cancelClubInvitation', 'resolveClubJoinRequest', 'resolveClubInvitation'
        ]);
        community.ownClubJoinRequests.and.returnValue(of({ Direccion: 'enviadas', Solicitudes: [], SiguienteCursor: null }));
        community.clubInvitations.and.returnValue(of({ Direccion: 'recibidas', Invitaciones: [], SiguienteCursor: null }));
        community.cancelOwnClubJoinRequest.and.returnValue(of(void 0));
        community.cancelClubInvitation.and.returnValue(of(void 0));
        community.resolveClubJoinRequest.and.returnValue(of(void 0));
        community.resolveClubInvitation.and.returnValue(of(void 0));
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        router.navigate.and.resolveTo(true);

        await TestBed.configureTestingModule({
            imports: [ClubAccessCenterComponent],
            providers: [
                { provide: CommunityService, useValue: community },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ClubAccessCenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('abre por defecto solicitudes enviadas pendientes y sincroniza el deep link', () => {
        expect(component.kind).toBe('solicitudes');
        expect(component.direction).toBe('enviadas');
        expect(component.state).toBe('pendiente');
        expect(community.ownClubJoinRequests).toHaveBeenCalledWith('enviadas', 'pendiente', undefined);
        expect(router.navigate).toHaveBeenCalled();
    });

    it('cambia de bandeja conservando filtros humanos', () => {
        component.selectKind('invitaciones');
        expect(community.clubInvitations).toHaveBeenCalledWith('enviadas', 'pendiente', undefined);
        expect(component.kind).toBe('invitaciones');
    });

    it('reconcilia la bandeja tras una cancelación incierta', () => {
        community.cancelOwnClubJoinRequest.and.returnValue(throwError(() => ({ status: 500 })));
        community.ownClubJoinRequests.calls.reset();
        component.rows = [{
            Id: 7,
            Club: { Id: 2, Nombre: 'Lectoras del norte', Visibilidad: 'cerrado' },
            Persona: null,
            PersonaSecundaria: null,
            Mensaje: null,
            Estado: 'pendiente',
            FechaCreacion: '2026-07-14T10:00:00Z',
            FechaResolucion: null
        } as never];
        component.cancel(component.rows[0] as never);
        expect(community.cancelOwnClubJoinRequest).toHaveBeenCalledWith(7);
        expect(community.ownClubJoinRequests).toHaveBeenCalled();
    });
});
