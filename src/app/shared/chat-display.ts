import { ChatConversation } from '../interfaces/chat';

export function chatConversationTitle(conversation: ChatConversation | null | undefined): string {
    if (!conversation)
        return 'Conversación';
    if (conversation.EsSistema || conversation.Tipo === 'sistema')
        return 'Yosiftware';
    const title = conversation.Titulo?.trim();
    if (title)
        return title;
    if (conversation.Tipo === 'club')
        return 'Chat de club';
    if (conversation.Tipo === 'grupo')
        return 'Grupo';
    const counterpart = conversation.Contraparte?.Nombre?.trim();
    if (counterpart)
        return counterpart;
    return 'Conversación directa';
}

export function chatConversationIcon(conversation: ChatConversation): string {
    if (conversation.EsSistema || conversation.Tipo === 'sistema') return 'campaign';
    if (conversation.Tipo === 'club') return 'groups';
    if (conversation.Tipo === 'grupo') return 'group';
    return 'person';
}
