export type AccountSecuritySection = 'account' | 'policies' | 'moderation' | 'blocks';

/** Apartados de Cuenta y seguridad, comunes a Wood y Web. */
export const accountSecuritySections: ReadonlyArray<{ id: AccountSecuritySection; label: string; icon: string; description: string }> = [
    { id: 'account', label: 'Tu cuenta', icon: 'manage_accounts', description: 'Entras con tu cuenta de Yosiftware. La contraseña, el correo, las formas de entrar y tus dispositivos se gestionan en ella.' },
    { id: 'policies', label: 'Normas de comunidad', icon: 'policy', description: 'Consulta y acepta las versiones vigentes.' },
    { id: 'moderation', label: 'Moderación', icon: 'gavel', description: 'Avisos y sanciones de tu cuenta, y tus alegaciones.' },
    { id: 'blocks', label: 'Perfiles bloqueados', icon: 'block', description: 'Personas que has bloqueado en Comunidad.' }
];

export function isAccountSecuritySection(value: string | null): value is AccountSecuritySection {
    return accountSecuritySections.some(section => section.id === value);
}
