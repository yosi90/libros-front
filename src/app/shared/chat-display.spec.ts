import { ChatConversation } from '../interfaces/chat';
import { chatConversationIcon, chatConversationTitle } from './chat-display';

describe('chat display', () => {
    const conversation = (partial: Partial<ChatConversation>): ChatConversation => ({
        Id: 1, Tipo: 'directa', Titulo: null, Web: null, FechaUltimoMensaje: null, NoLeidos: 0, PuedeEnviar: true, RolParticipante: 'miembro',
        Cerrada: false, Miembros: 2, Contraparte: null, UltimoMensaje: null, Permisos: { Escribir: true, Invitar: false, Administrar: false, Salir: true },
        ...partial
    });

    it('conserva títulos humanos y fallbacks por tipo', () => {
        expect(chatConversationTitle(conversation({ Titulo: 'Lectores nocturnos' }))).toBe('Lectores nocturnos');
        expect(chatConversationTitle(conversation({ Tipo: 'web' }))).toBe('Chat de club');
        expect(chatConversationTitle(conversation({ Tipo: 'grupo' }))).toBe('Grupo');
        expect(chatConversationTitle(conversation({ Contraparte: { Id: 'c-9', Alias: 'mara', Nombre: 'Mara', Imagen: null, Borrada: false } }))).toBe('Mara');
    });

    it('elige el icono por tipo de conversación', () => {
        expect(chatConversationIcon(conversation({ Tipo: 'web' }))).toBe('groups');
        expect(chatConversationIcon(conversation({ Tipo: 'grupo' }))).toBe('group');
        expect(chatConversationIcon(conversation({}))).toBe('person');
    });
});
