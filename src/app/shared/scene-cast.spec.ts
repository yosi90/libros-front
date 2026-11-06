import { Character, CharacterAlias } from '../interfaces/character';
import { HttpErrorResponse } from '@angular/common/http';
import {
    castNameToCreate, duplicateCharacterQuestion, filterSceneCast, findCharacterNamed, isRejectedCharacterClientRequestId, pressCastIcon, withSceneCastFirst
} from './scene-cast';

/** Los mismos casos que la APK (`RepartoDeEscenaTest`). */
describe('scene-cast', () => {
    const alias = (Apodo: string, Borrado = false) => ({ Id: 0, ApodoId: 0, Apodo, Borrado } as CharacterAlias);
    const character = (Id: number, Nombre: string, Apodos: CharacterAlias[] = []) => ({ Id, Nombre, Apodos } as unknown as Character);
    const characters = [
        character(1, 'Citra Terranova', [alias('Anastasia')]),
        character(2, 'Rowan'),
        character(3, 'Marie Curie', [alias('Curie')]),
        character(4, 'Mercury'),
        character(5, 'Segador Goddard'),
        character(6, 'Ángela', [alias('Viejo', true)])
    ];
    const names = (query: string, exclude = new Set<number>()) => filterSceneCast(characters, query, exclude).map(item => item.Nombre);

    it('sin consulta salen todos por nombre, menos los excluidos', () => {
        expect(names('')).toEqual(['Ángela', 'Citra Terranova', 'Marie Curie', 'Mercury', 'Rowan', 'Segador Goddard']);
        expect(names('  ', new Set([1, 2]))).toEqual(['Ángela', 'Marie Curie', 'Mercury', 'Segador Goddard']);
    });

    it('busca sin tildes ni mayúsculas por nombre y apodo, primero los que empiezan así', () => {
        // «Curie» empieza por «cur» (por su apodo y por la segunda palabra); «Mercury» solo lo lleva dentro.
        expect(names('CUR')).toEqual(['Marie Curie', 'Mercury']);
        expect(names('ange')).toEqual(['Ángela']);
        expect(names('anast')).toEqual(['Citra Terranova']);
        expect(names('godd')).toEqual(['Segador Goddard']);
        // Un apodo borrado ya no cuenta.
        expect(names('viejo')).toEqual([]);
    });

    it('«Crear» pide un nombre de 3 a 100 caracteres', () => {
        expect(castNameToCreate('cu')).toBeNull();
        expect(castNameToCreate('   ')).toBeNull();
        expect(castNameToCreate('  Faraday ')).toBe('Faraday');
        expect(castNameToCreate('Segador   Faraday')).toBe('Segador Faraday');
        expect(castNameToCreate('x'.repeat(101))).toBeNull();
    });

    it('el nombre repetido se compara sin tildes ni mayúsculas', () => {
        expect(findCharacterNamed(characters, 'rowan')?.Id).toBe(2);
        expect(findCharacterNamed(characters, ' angela ')?.Id).toBe(6);
        expect(findCharacterNamed(characters, 'Curie')).toBeUndefined();
        expect(findCharacterNamed(characters, '  ')).toBeUndefined();
        expect(duplicateCharacterQuestion('Rowan')).toBe('Ya hay un personaje llamado «Rowan» en este libro. ¿Quieres crear otro con el mismo nombre?');
    });

    it('el IdCliente rechazado por la API se cambia en el siguiente intento', () => {
        const apiError = (code: string, status = 409) => new HttpErrorResponse({ status, error: { error: 'No', code } });
        expect(isRejectedCharacterClientRequestId(apiError('character_client_request_conflict'))).toBeTrue();
        expect(isRejectedCharacterClientRequestId(apiError('invalid_client_request_id', 400))).toBeTrue();
        expect(isRejectedCharacterClientRequestId(apiError('validation_error', 400))).toBeFalse();
        expect(isRejectedCharacterClientRequestId(new Error('timeout'))).toBeFalse();
    });

    it('los dos iconos funcionan como un radio que se puede apagar', () => {
        const scene = [{ Id: 3, Nombrado: false }, { Id: 4, Nombrado: true }];
        // Uno que no está entra como diga el icono.
        expect(pressCastIcon(scene, 1, false)).toEqual([...scene, { Id: 1, Nombrado: false }]);
        expect(pressCastIcon(scene, 1, true)).toEqual([...scene, { Id: 1, Nombrado: true }]);
        // Encender el otro icono cambia cómo está, sin repetirlo.
        expect(pressCastIcon(scene, 3, true)).toEqual([{ Id: 4, Nombrado: true }, { Id: 3, Nombrado: true }]);
        expect(pressCastIcon(scene, 4, false)).toEqual([{ Id: 3, Nombrado: false }, { Id: 4, Nombrado: false }]);
        // Pulsar el encendido lo saca de la escena.
        expect(pressCastIcon(scene, 3, false)).toEqual([{ Id: 4, Nombrado: true }]);
        expect(pressCastIcon(scene, 4, true)).toEqual([{ Id: 3, Nombrado: false }]);
    });

    it('la lista pone arriba a los que estaban en la escena sin mover el resto', () => {
        expect(withSceneCastFirst(filterSceneCast(characters, ''), new Set([5, 2])).map(item => item.Nombre))
            .toEqual(['Rowan', 'Segador Goddard', 'Ángela', 'Citra Terranova', 'Marie Curie', 'Mercury']);
        expect(withSceneCastFirst(filterSceneCast(characters, 'cur'), new Set([5])).map(item => item.Nombre)).toEqual(['Marie Curie', 'Mercury']);
    });
});
