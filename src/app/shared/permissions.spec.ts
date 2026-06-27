import { canModerateCatalogRole, isAdminRole } from './permissions';

describe('permissions', () => {
    it('allows only administrators in admin-only surfaces', () => {
        expect(isAdminRole({ Nombre: 'administrador' })).toBeTrue();
        expect(isAdminRole({ Nombre: 'moderador' })).toBeFalse();
        expect(isAdminRole({ Nombre: 'usuario' })).toBeFalse();
    });

    it('allows administrators and moderators to moderate catalog', () => {
        expect(canModerateCatalogRole({ Nombre: 'administrador' })).toBeTrue();
        expect(canModerateCatalogRole({ Nombre: 'moderador' })).toBeTrue();
        expect(canModerateCatalogRole({ Nombre: 'usuario' })).toBeFalse();
    });
});
