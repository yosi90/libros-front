import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { MensajeDelCanal } from '../interfaces/platform-spaces';
import { ClubChannelReconciler, ClubChannelSection, FEED_RETRY_DELAYS_MS, clubIdFromSpace, clubPersonName, spaceErrorMessage } from './club-spaces';
import { SIN_SESION_PLATAFORMA } from './platform';

describe('Los clubes en los espacios', () => {
    const message = (secuencia: number, tipo: string, extra: Record<string, unknown> = {}): MensajeDelCanal =>
        ({ tipo: 'mensaje', espacio: 9, secuencia, idExterno: `${tipo}-${secuencia}`, datos: { tipo, ClubId: 4, ...extra }, fecha: '' });

    function reconciler() {
        const batches: Array<ClubChannelSection[]> = [];
        const closed: string[] = [];
        const instance = new ClubChannelReconciler(4, {
            refresh: sections => batches.push([...sections].sort()),
            closed: (reason, code) => closed.push(`${reason}:${code}`)
        }, 100);
        return { instance, batches, closed };
    }

    it('nombra a una persona por su nombre o, sin él, por @alias', () => {
        expect(clubPersonName({ nombre: 'Ana', alias: 'ana' })).toBe('Ana');
        expect(clubPersonName({ nombre: null, alias: 'ana' })).toBe('@ana');
    });

    it('saca el club de Libros del idExterno del espacio', () => {
        expect(clubIdFromSpace('club-42')).toBe(42);
        expect(clubIdFromSpace('campana-42')).toBeNull();
        expect(clubIdFromSpace(null)).toBeNull();
    });

    it('enseña la frase de la plataforma tal cual (ya dice «club») y, sin frase, la de la pantalla', () => {
        const error = (code: string, texto?: string) => new HttpErrorResponse({ status: 409, error: { code, ...(texto ? { error: texto } : {}) } });
        expect(spaceErrorMessage(error('espacio_lleno', 'Este club ya tiene 2000 miembros.'), 'x')).toBe('Este club ya tiene 2000 miembros.');
        expect(spaceErrorMessage(error('dos_pasos_necesarios', 'Este club pide la verificación en dos pasos.'), 'x')).toContain('dos pasos');
        expect(spaceErrorMessage(error('espacio_lleno'), 'Texto de la pantalla')).toBe('Texto de la pantalla');
        expect(spaceErrorMessage(new HttpErrorResponse({ status: 0 }), 'Sin conexión')).toBe('Sin conexión');
        // Sin sesión, PlatformApiService no llama: el mismo error se explica igual.
        expect(spaceErrorMessage(SIN_SESION_PLATAFORMA, 'x')).toBe('Entra con tu cuenta de Yosiftware.');
    });

    it('la espera del feed está acotada (unos cinco minutos) y no es infinita', () => {
        const total = FEED_RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0);
        expect(total).toBeGreaterThanOrEqual(5 * 60_000);
        expect(total).toBeLessThan(6 * 60_000);
    });

    it('aplica los mensajes del canal en orden y sin repetir, agrupando los seguidos', fakeAsync(() => {
        const { instance, batches } = reconciler();

        instance.apply(message(1, 'club.reading_updated', { LecturaId: 3 }));
        instance.apply(message(2, 'club.milestone_created', { HitoId: 5 }));
        instance.apply(message(2, 'club.milestone_created', { HitoId: 5 }));
        instance.apply(message(1, 'club.event_created', { EventoId: 6 }));
        tick(100);

        expect(batches).toEqual([['milestones', 'readings']]);
        expect(instance.sequence).toBe(2);

        instance.apply(message(3, 'club.event_deleted', { EventoId: 6 }));
        instance.apply(message(4, 'club.updated'));
        tick(100);
        expect(batches[1]).toEqual(['calendar', 'club']);
    }));

    it('ignora lo de otro club y los tipos que no conoce', fakeAsync(() => {
        const { instance, batches } = reconciler();

        instance.apply(message(1, 'club.updated', { ClubId: 99 }));
        instance.apply(message(2, 'otra.cosa'));
        tick(100);

        expect(batches).toEqual([]);
    }));

    it('con desfase recarga todo de la API', fakeAsync(() => {
        const { instance, batches } = reconciler();

        instance.apply(message(1, 'club.updated'));
        instance.apply({ tipo: 'desfase', espacio: 9 });
        tick(100);

        expect(batches).toEqual([['all']]);
    }));

    it('con cerrado o error deja de escuchar, sin más recargas', fakeAsync(() => {
        const { instance, batches, closed } = reconciler();

        instance.apply(message(1, 'club.updated'));
        instance.apply({ tipo: 'cerrado', espacio: 9, motivo: 'expulsado' });
        instance.apply(message(2, 'club.updated'));
        tick(200);

        expect(closed).toEqual(['cerrado:expulsado']);
        expect(batches).toEqual([]);
    }));
});
