export type AccountSecuritySection = 'access' | 'credentials' | 'devices' | 'policies' | 'moderation' | 'blocks';

/** Apartados de Cuenta y seguridad, comunes a Wood y Web. */
export const accountSecuritySections: ReadonlyArray<{ id: AccountSecuritySection; label: string; icon: string; description: string }> = [
    { id: 'access', label: 'Métodos de acceso', icon: 'key', description: 'Formas de entrar en tu cuenta. Conserva al menos una que puedas recuperar.' },
    { id: 'credentials', label: 'Contraseña y correo', icon: 'password', description: 'Te pediremos confirmar tu identidad solo al guardar un cambio.' },
    { id: 'devices', label: 'Dispositivos', icon: 'devices', description: 'Sesiones que todavía pueden acceder a tu cuenta.' },
    { id: 'policies', label: 'Normas de comunidad', icon: 'policy', description: 'Consulta y acepta las versiones vigentes.' },
    { id: 'moderation', label: 'Moderación', icon: 'gavel', description: 'Avisos y sanciones de tu cuenta, y tus alegaciones.' },
    { id: 'blocks', label: 'Perfiles bloqueados', icon: 'block', description: 'Personas que has bloqueado en Comunidad.' }
];

export function isAccountSecuritySection(value: string | null): value is AccountSecuritySection {
    return accountSecuritySections.some(section => section.id === value);
}
