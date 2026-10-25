import { catalogRequestResponsePayload } from './catalog-request-labels';

describe('catalogRequestResponsePayload', () => {
    it('añade la respuesta al texto de una petición «otro», sin más claves que Texto y Titulo', () => {
        expect(catalogRequestResponsePayload({ TipoEntidad: 'otro', Payload: { Texto: ' Falta un autor ', Titulo: 'Autores' } }, 'Es Brandon Sanderson'))
            .toEqual({ Texto: 'Falta un autor\n\nEs Brandon Sanderson', Titulo: 'Autores' });
    });

    it('sin texto previo ni título, la respuesta es el texto', () => {
        expect(catalogRequestResponsePayload({ TipoEntidad: 'otro', Payload: { Comentario: 'viejo' } }, 'Nuevo')).toEqual({ Texto: 'Nuevo' });
    });

    it('en las demás, reenvía el payload con la respuesta en Comentario', () => {
        expect(catalogRequestResponsePayload({ TipoEntidad: 'libro', Payload: { ISBN: '9788466658904', Comentario: 'viejo' } }, 'Corregido'))
            .toEqual({ ISBN: '9788466658904', Comentario: 'Corregido' });
    });
});
