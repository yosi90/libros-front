import { environment } from '../../environment/environment';
import { PlataformaConversacion, PlataformaMensaje } from '../interfaces/platform-chat';
import { PlataformaPersona } from '../interfaces/platform-person';
import {
    CHAT_EDIT_WINDOW_MS,
    avisoText,
    conversationPreview,
    renderPlainChatText,
    toChatConversation,
    toChatConversationDetail,
    toChatMessage,
    toChatPerson,
    toChatReactions
} from './platform-chat';

describe('platform chat mapping', () => {
    const yo = 'cuenta-yo';
    const ana: PlataformaPersona = { id: 'cuenta-ana', alias: 'ana', nombre: 'Ana', avatar: { url: '/v1/perfiles/ana/avatar?v=2', miniatura: '/v1/perfiles/ana/avatar/miniatura?v=2' } };
    const borrada: PlataformaPersona = { id: 'cuenta-x', alias: 'cuenta-borrada', nombre: 'Cuenta borrada', avatar: null, borrada: true };
    const mensaje = (partial: Partial<PlataformaMensaje> = {}): PlataformaMensaje => ({
        id: 10, conversacion: 4, tipo: 'texto', persona: ana, texto: 'Hola', aviso: null, respuesta: null,
        reacciones: { total: {}, mia: null }, editado: null, borrado: false, noDisponible: false, creado: new Date().toISOString(), ...partial
    });
    const conversacion = (partial: Partial<PlataformaConversacion> = {}): PlataformaConversacion => ({
        id: 4, tipo: 'directa', titulo: null, persona: ana, web: null, miembros: 2, rol: 'miembro', noLeidos: 3, ultimoMensaje: mensaje(),
        actividad: '2026-10-24T10:00:00Z', cerrada: false, permisos: { escribir: true, invitar: false, administrar: false, salir: true, borrar: true }, ...partial
    });

    it('resuelve los avatares relativos contra la API de la plataforma y no enlaza cuentas borradas', () => {
        const persona = toChatPerson(ana)!;
        expect(persona.Imagen).toBe(new URL('/v1/perfiles/ana/avatar/miniatura?v=2', environment.plataforma.apiUrl).href);
        expect(toChatPerson(borrada)).toEqual(jasmine.objectContaining({ Nombre: 'Cuenta borrada', Imagen: null, Borrada: true }));
    });

    it('traduce una directa: el título es la otra persona y escribir sigue los permisos', () => {
        const directa = toChatConversation(conversacion(), yo);
        expect(directa).toEqual(jasmine.objectContaining({ Id: 4, Tipo: 'directa', Titulo: 'Ana', NoLeidos: 3, PuedeEnviar: true }));
        expect(directa.UltimoMensaje?.VistaPrevia).toBe('Hola');
        // Una directa sin amistad es de solo lectura.
        expect(toChatConversation(conversacion({ permisos: { escribir: false, invitar: false, administrar: false, salir: true, borrar: true } }), yo).PuedeEnviar).toBeFalse();
    });

    it('marca las conversaciones de una comunidad con su web y prefija la vista previa con quien escribe', () => {
        const club = conversacion({ tipo: 'web', titulo: 'Club de Dune', persona: null, web: { clave: 'libros', nombre: 'Libros' }, miembros: 5 });
        expect(toChatConversation(club, yo)).toEqual(jasmine.objectContaining({ Tipo: 'web', Titulo: 'Club de Dune', Web: { Clave: 'libros', Nombre: 'Libros' } }));
        expect(conversationPreview(club, yo)).toBe('Ana: Hola');
        expect(conversationPreview({ ...club, ultimoMensaje: mensaje({ persona: { ...ana, id: yo } }) }, yo)).toBe('Tú: Hola');
        expect(conversationPreview({ ...club, ultimoMensaje: null }, yo)).toBe('5 personas');
    });

    it('cuenta las cinco reacciones de Libros por su emoji y conserva las demás', () => {
        const reactions = toChatReactions({ '❤️': 2, '👍': 1, '🎉': 4 }, '🎉');
        expect(reactions.PorTipo.me_gusta).toBe(2);
        expect(reactions.PorTipo.apoyo).toBe(1);
        expect(reactions.Otras).toEqual([{ Emoji: '🎉', Total: 4 }]);
        expect(reactions.MiReaccion).toBeNull();
        expect(reactions.MiEmoji).toBe('🎉');
        // La plataforma puede devolver el emoji sin el selector de variación.
        expect(toChatReactions({ '❤': 1 }, '❤').MiReaccion).toBe('me_gusta');
    });

    it('deja editar los mensajes propios solo en sus 15 minutos y nunca denunciar uno propio', () => {
        const now = Date.parse('2026-10-24T10:00:00Z');
        const propio = toChatMessage(mensaje({ persona: { ...ana, id: yo }, creado: new Date(now - 60_000).toISOString() }), yo, true, now);
        expect(propio.Propio).toBeTrue();
        expect(propio.Permisos).toEqual({ PuedeResponder: true, PuedeReaccionar: true, PuedeEditar: true, PuedeBorrar: true, PuedeDenunciar: false });
        const antiguo = toChatMessage(mensaje({ persona: { ...ana, id: yo }, creado: new Date(now - CHAT_EDIT_WINDOW_MS - 1).toISOString() }), yo, true, now);
        expect(antiguo.Permisos.PuedeEditar).toBeFalse();
        const ajeno = toChatMessage(mensaje(), yo, false, now);
        expect(ajeno.Permisos).toEqual({ PuedeResponder: false, PuedeReaccionar: false, PuedeEditar: false, PuedeBorrar: false, PuedeDenunciar: true });
    });

    it('enseña los mensajes de alguien bloqueado como no disponibles, sin acciones', () => {
        const oculto = toChatMessage(mensaje({ persona: null, texto: null, noDisponible: true }), yo);
        expect(oculto.Texto).toBe('Mensaje no disponible');
        expect(Object.values(oculto.Permisos).some(Boolean)).toBeFalse();
    });

    it('escribe los avisos del chat como el SDK', () => {
        const aviso = (codigo: string, datos: Record<string, unknown>) => mensaje({ tipo: 'aviso', persona: null, texto: null, aviso: { codigo, datos, personas: { [ana.id]: ana } } });
        expect(avisoText(aviso('grupo.creado', { cuenta: ana.id, titulo: 'Lectores' }), yo)).toBe('Ana creó el grupo «Lectores»');
        expect(avisoText(aviso('miembro.unido', { cuenta: yo }), yo)).toBe('Te has unido');
        expect(avisoText(aviso('temporal.cambiado', { por: ana.id, segundos: 604800 }), yo)).toBe('Ana ha activado los mensajes temporales: 7 días');
        const sistema = toChatMessage(aviso('miembro.salido', { cuenta: ana.id }), yo);
        expect(sistema).toEqual(jasmine.objectContaining({ TipoRemitente: 'sistema', Texto: 'Ana ha salido', Propio: false }));
        expect(Object.values(sistema.Permisos).some(Boolean)).toBeFalse();
    });

    it('lleva los participantes y quién puede gestionar un grupo', () => {
        const detalle = toChatConversationDetail({
            ...conversacion({ tipo: 'grupo', titulo: 'Lectores', persona: null, permisos: { escribir: true, invitar: true, administrar: true, salir: true, borrar: false } }),
            participantes: [{ persona: ana, rol: 'admin' }, { persona: { ...ana, id: yo, nombre: 'Yo' }, rol: 'miembro' }]
        }, yo);
        expect(detalle.PuedeGestionarParticipantes).toBeTrue();
        expect(detalle.Participantes.map(item => [item.UsuarioId, item.Rol])).toEqual([['cuenta-ana', 'admin'], [yo, 'miembro']]);
    });

    it('pinta el texto plano del chat sin interpretar HTML ni Markdown', () => {
        expect(renderPlainChatText('<b>**hola**</b>\nadiós')).toBe('&lt;b&gt;**hola**&lt;/b&gt;<br>adiós');
    });
});
