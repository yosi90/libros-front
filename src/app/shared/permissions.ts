import { Role } from '../interfaces/user';

export function isAdminRole(role: Pick<Role, 'Nombre'> | null | undefined): boolean {
    return role?.Nombre === 'administrador';
}

export function canModerateCatalogRole(role: Pick<Role, 'Nombre'> | null | undefined): boolean {
    return role?.Nombre === 'administrador' || role?.Nombre === 'moderador';
}
