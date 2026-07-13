import { ChatConversation } from '../interfaces/chat';
import { chatConversationIcon, chatConversationTitle } from './chat-display';

describe('chat display', () => {
    const conversation = (partial: Partial<ChatConversation>): ChatConversation => ({ Id: 1, Tipo: 'directa', Titulo: null, ClubId: null, FechaUltimoMensaje: null, NoLeidos: 0, ...partial });

    it('resuelve Yosiftware únicamente desde el tipo o indicador de sistema', () => {
        expect(chatConversationTitle(conversation({ Tipo: 'sistema', Titulo: 'Nombre histórico' }))).toBe('Yosiftware');
        expect(chatConversationIcon(conversation({ EsSistema: true }))).toBe('campaign');
    });

    it('conserva títulos humanos y fallbacks por dominio', () => {
        expect(chatConversationTitle(conversation({ Titulo: 'Lectores nocturnos' }))).toBe('Lectores nocturnos');
        expect(chatConversationTitle(conversation({ Tipo: 'club' }))).toBe('Chat de club');
        expect(chatConversationTitle(conversation({ Tipo: 'grupo' }))).toBe('Grupo');
        expect(chatConversationTitle(conversation({ Contraparte: { Id: 9, Nombre: 'Mara', Imagen: null } }))).toBe('Mara');
    });
});
