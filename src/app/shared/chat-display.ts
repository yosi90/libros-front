import { ChatConversation, ChatFriendship, ChatGroupCandidate } from '../interfaces/chat';

export function chatConversationTitle(conversation: ChatConversation | null | undefined): string {
    if (!conversation)
        return 'Conversación';
    const title = conversation.Titulo?.trim();
    if (title)
        return title;
    if (conversation.Tipo === 'web')
        return 'Chat de club';
    if (conversation.Tipo === 'grupo')
        return 'Grupo';
    const counterpart = conversation.Contraparte?.Nombre?.trim();
    if (counterpart)
        return counterpart;
    return 'Conversación directa';
}

export function chatConversationIcon(conversation: ChatConversation): string {
    if (conversation.Tipo === 'web') return 'groups';
    if (conversation.Tipo === 'grupo') return 'group';
    return 'person';
}

/** `club`: las conversaciones de las comunidades (tipo `web` en la plataforma). */
export type ChatConversationFilter = 'todas' | 'directa' | 'club' | 'grupo';

export function matchesConversationFilter(conversation: ChatConversation, filter: ChatConversationFilter): boolean {
    if (filter === 'todas') return true;
    return filter === 'club' ? conversation.Tipo === 'web' : conversation.Tipo === filter;
}

/** Las amistades que coinciden con lo buscado, para invitarlas a un grupo (solo se invita a amistades). */
export function friendshipCandidates(friendships: ChatFriendship[], query: string): ChatGroupCandidate[] {
    const term = query.trim().toLocaleLowerCase('es');
    return friendships
        .filter(item => !term || item.Usuario.Nombre.toLocaleLowerCase('es').includes(term) || item.Usuario.Alias.toLocaleLowerCase('es').includes(term))
        .map(item => ({ UsuarioId: item.Usuario.Id, Nombre: item.Usuario.Nombre, Imagen: item.Usuario.Imagen, EsAmistad: true }));
}
