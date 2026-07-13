import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { ChatService } from './chat.service';

describe('ChatService hub social', () => {
    let service: ChatService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [
            ChatService,
            provideHttpClient(),
            provideHttpClientTesting(),
            { provide: ModerationAccessService, useValue: { gate: (_capability: string, _write: boolean, request: Observable<unknown>) => request } }
        ] });
        service = TestBed.inject(ChatService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('carga el detalle fresco de una conversación', () => {
        service.conversation(12).subscribe(value => expect(value.Id).toBe(12));

        const request = http.expectOne(`${environment.apiUrl}chat/conversaciones/12`);
        expect(request.request.method).toBe('GET');
        request.flush({ success: true, Conversacion: { Id: 12, Tipo: 'grupo', EsSistema: false, PuedeEnviar: true, PuedeGestionarParticipantes: true, Participantes: [] } });
    });

    it('crea grupos con el contrato documentado', () => {
        service.createGroup('Lecturas fantásticas', [4, 9]).subscribe(id => expect(id).toBe(31));

        const request = http.expectOne(`${environment.apiUrl}chat/grupos`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ Titulo: 'Lecturas fantásticas', Participantes: [4, 9] });
        request.flush({ success: true, Id: 31 });
    });

    it('administra participantes con rutas discriminadas', () => {
        service.changeGroupParticipantRole(31, 9, 'admin').subscribe();

        const request = http.expectOne(`${environment.apiUrl}chat/grupos/31/participantes/9/rol`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({ Rol: 'admin' });
        request.flush({ success: true });
    });

    it('envía la versión optimista al guardar preferencias flotantes', () => {
        service.saveFloatingPreferences({ Version: 3, ModoListado: 'minimizado', PosicionListado: null }).subscribe();

        const request = http.expectOne(`${environment.apiUrl}chat/preferencias-flotantes`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({ Version: 3, ModoListado: 'minimizado', PosicionListado: null });
        request.flush({ success: true, Preferencias: { VersionShape: 1, Version: 4, FechaActualizacion: null, AutoabrirListado: false, PermitirBurbujas: true, ModoListado: 'minimizado', PosicionListado: null, TamanoListado: null, ConversacionesFlotantes: [] } });
    });
});
