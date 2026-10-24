import { NgZone } from '@angular/core';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { MensajeDelCanal } from '../../interfaces/platform-spaces';
import { YosiftwareSdkDouble } from '../auth/yosiftware-sdk.testing';
import { PlatformSpacesService } from './platform-spaces.service';

describe('PlatformSpacesService', () => {
    function create() {
        const sdk = new YosiftwareSdkDouble();
        const session = {
            generation: 1,
            isCurrentGeneration(value: number) { return value === session.generation; },
            platformSdk: async () => sdk
        };
        const api = jasmine.createSpyObj('PlatformApiService', ['get', 'post', 'put', 'patch', 'delete']);
        api.get.and.returnValue(of({}));
        api.post.and.returnValue(of({}));
        api.delete.and.returnValue(of(null));
        const access = { gate: (_scope: unknown, _creation: unknown, request: Observable<unknown>) => request };
        const zone = { run: (fn: () => void) => fn() } as unknown as NgZone;
        const service = new PlatformSpacesService(api, session as never, access as never, zone);
        return { service, api, sdk, session };
    }

    it('entra en un club abierto con la ruta del espacio y recuerda la entrada para esperar al feed', () => {
        const { service, api } = create();
        api.post.and.returnValue(of({ id: 9, idExterno: 'club-4', yo: { estado: 'activo' } }));

        service.enter(9, 4).subscribe();

        expect(api.post).toHaveBeenCalledOnceWith('/v1/espacios/9/entrar');
        expect(service.isRecentEntry(4)).toBeTrue();
        expect(service.isRecentEntry(5)).toBeFalse();
    });

    it('sale con DELETE …/miembros/yo y olvida la entrada reciente', () => {
        const { service, api } = create();
        service.markEntered(4);

        service.leave(9, 4).subscribe();

        expect(api.delete).toHaveBeenCalledOnceWith('/v1/espacios/9/miembros/yo');
        expect(service.isRecentEntry(4)).toBeFalse();
    });

    it('pide entrar con el mensaje opcional y deja retirarla (la plataforma no lista las propias)', () => {
        const { service, api } = create();

        service.requestAccess(9, { Id: 4, Nombre: 'Club de Dune' }, '  Me encantaría  ').subscribe();
        expect(api.post).toHaveBeenCalledOnceWith('/v1/espacios/9/solicitudes', { mensaje: 'Me encantaría' });
        expect(service.hasOwnRequest(9)).toBeTrue();
        expect(service.ownRequestsSent()).toEqual([jasmine.objectContaining({ espacioId: 9, clubId: 4, nombre: 'Club de Dune', mensaje: 'Me encantaría' })]);

        service.withdrawRequest(9).subscribe();
        expect(api.delete).toHaveBeenCalledOnceWith('/v1/espacios/9/solicitudes/mia');
        expect(service.hasOwnRequest(9)).toBeFalse();
    });

    it('invita a una cuenta o a un correo, con el rol solo si se elige', () => {
        const { service, api } = create();

        service.invite(9, { cuenta: 'cuenta-ana' }).subscribe();
        service.invite(9, { correo: 'ana@ejemplo.es' }, 'moderacion').subscribe();

        expect(api.post.calls.argsFor(0)).toEqual(['/v1/espacios/9/invitaciones', { cuenta: 'cuenta-ana' }]);
        expect(api.post.calls.argsFor(1)).toEqual(['/v1/espacios/9/invitaciones', { correo: 'ana@ejemplo.es', rol: 'moderacion' }]);
    });

    it('acepta por código, aprueba solicitudes y busca personas en la plataforma', () => {
        const { service, api } = create();
        api.get.and.returnValue(of({ personas: [{ id: 'a', alias: 'ana' }] }));
        let people: unknown[] = [];

        service.acceptByCode('XYZ').subscribe();
        service.resolveJoinRequest(9, 3, 'aprobar').subscribe();
        service.searchPeople('  ana ').subscribe(found => people = found);

        expect(api.post.calls.argsFor(0)).toEqual(['/v1/espacios/invitaciones/por-codigo/aceptar', { codigo: 'XYZ' }]);
        expect(api.post.calls.argsFor(1)).toEqual(['/v1/espacios/9/solicitudes/3/aprobar']);
        expect(api.get).toHaveBeenCalledOnceWith('/v1/personas', { q: 'ana' });
        expect(people.length).toBe(1);
    });

    it('no recuerda la solicitud si la plataforma la rechaza', () => {
        const { service, api } = create();
        api.post.and.returnValue(throwError(() => ({ status: 409, error: { code: 'espacio_sin_solicitudes' } })));

        service.requestAccess(9, { Id: 4, Nombre: 'Club' }).subscribe({ error: () => undefined });

        expect(service.hasOwnRequest(9)).toBeFalse();
    });

    it('abre el canal del espacio con el SDK, descarta lo que llega con otra cuenta y lo cierra al cambiarla', fakeAsync(() => {
        const { service, sdk, session } = create();
        const received: MensajeDelCanal[] = [];

        service.openChannel(9, message => received.push(message));
        flushMicrotasks();
        expect(sdk.espacios.canal).toHaveBeenCalledOnceWith(9, jasmine.any(Function));
        expect(service.openChannels).toBe(1);

        sdk.canal(9, { tipo: 'mensaje', espacio: 9, secuencia: 1, idExterno: 'a', datos: { tipo: 'club.updated', ClubId: 4 }, fecha: '' });
        expect(received.length).toBe(1);

        session.generation = 2;
        sdk.canal(9, { tipo: 'mensaje', espacio: 9, secuencia: 2, idExterno: 'b', datos: { tipo: 'club.updated', ClubId: 4 }, fecha: '' });
        expect(received.length).toBe(1);

        service.clear();
        expect(service.openChannels).toBe(0);
        expect(sdk.canalesAbiertos).toBe(0);
    }));

    it('un canal que se cierra antes de que cargue el SDK no se llega a abrir', fakeAsync(() => {
        const { service, sdk } = create();

        service.openChannel(9, () => undefined).close();
        flushMicrotasks();

        expect(sdk.espacios.canal).not.toHaveBeenCalled();
        expect(service.openChannels).toBe(0);
    }));

    it('al cambiar de cuenta olvida las solicitudes enviadas y las entradas recientes', () => {
        const { service } = create();
        service.markEntered(4);
        service.requestAccess(9, { Id: 4, Nombre: 'Club' }).subscribe();

        service.clear();

        expect(service.isRecentEntry(4)).toBeFalse();
        expect(service.hasOwnRequest(9)).toBeFalse();
    });
});
