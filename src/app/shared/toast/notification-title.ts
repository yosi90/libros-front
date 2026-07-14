import { AppToastType } from './app-toast';

export function resolveNotificationTitle(type: AppToastType, message: string, explicitTitle?: string): string {
    const explicit = `${explicitTitle ?? ''}`.trim();
    if (explicit) return explicit;

    const normalized = message.toLocaleLowerCase();
    if (normalized.includes('email verificado')) return 'Correo verificado';
    if (normalized.includes('biblioteca')) return type === 'error' ? 'No se pudo actualizar la biblioteca' : 'Biblioteca actualizada';
    if (normalized.includes('norma')) return type === 'error' ? 'No se pudieron actualizar las normas' : 'Normas de comunidad actualizadas';
    if (normalized.includes('preferencias de privacidad')) return type === 'error' ? 'No se pudo guardar la privacidad' : 'Privacidad actualizada';
    if (normalized.includes('preferencias de notificaciones')) return type === 'error' ? 'No se pudieron guardar las notificaciones' : 'Notificaciones actualizadas';
    if (normalized.includes('preferencias de chat')) return type === 'error' ? 'No se pudieron guardar las preferencias de chat' : 'Preferencias de chat actualizadas';
    if (normalized.includes('preferencias de actividad')) return type === 'error' ? 'No se pudo guardar la actividad' : 'Actividad lectora actualizada';
    if (normalized.includes('push')) return type === 'error' ? 'No se pudo activar Push' : 'Notificaciones Push actualizadas';

    const firstSentence = message.split(/(?<=[.!?])\s+/)[0]?.trim();
    return firstSentence || message.trim();
}
