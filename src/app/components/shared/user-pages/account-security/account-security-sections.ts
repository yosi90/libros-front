export type AccountSecuritySection = 'account' | 'privacy' | 'data';

/** Apartados de Cuenta y seguridad, comunes a Wood y Web. Todo es de la cuenta de Yosiftware salvo los datos de Libros. */
export const accountSecuritySections: ReadonlyArray<{ id: AccountSecuritySection; label: string; icon: string; description: string }> = [
    { id: 'account', label: 'Tu cuenta', icon: 'manage_accounts', description: 'Entras con tu cuenta de Yosiftware. La contraseña, el correo, las formas de entrar y tus dispositivos se gestionan en ella.' },
    { id: 'privacy', label: 'Privacidad y normas', icon: 'privacy_tip', description: 'Tu privacidad en Libros, las normas, tu moderación y los bloqueos son de tu cuenta de Yosiftware.' },
    { id: 'data', label: 'Tus datos', icon: 'download', description: 'Lo que guarda Yosiftware de ti se descarga en tu cuenta; lo que guarda Libros se pide aparte.' }
];

/** Los apartados de antes (normas, moderación y bloqueos propios) se retiraron con la adhesión: llevan a la privacidad. */
const legacySections: Record<string, AccountSecuritySection> = { policies: 'privacy', moderation: 'privacy', blocks: 'privacy' };

export function isAccountSecuritySection(value: string | null): value is AccountSecuritySection {
    return accountSecuritySections.some(section => section.id === value);
}

export function resolveAccountSecuritySection(value: string | null): AccountSecuritySection | null {
    if (isAccountSecuritySection(value)) return value;
    return value ? legacySections[value] ?? null : null;
}
