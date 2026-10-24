export const environment = {
    production: false,
    environmentName: 'produccion',
    mobilePresentationEnabled: true,
    webPresentationEnabled: true,
    // Cambios incompatibles de la web o de la API: limpia lo guardado por versiones anteriores.
    sessionVersion: '2026-10-24-adhesion-yosiftware',
    clientVersion: '1.0.0',
    apiUrl: 'https://libros-api.yosiftware.es/',
    getImgUrl: 'https://libros-api.yosiftware.es/image/get/',
    // La cuenta y la sesión son de la plataforma Yosiftware (ecosistema-kit/ACCESO.md).
    plataforma: {
        sdkUrl: 'https://cuentas.yosiftware.es/sdk/v1/yosiftware.js',
        apiUrl: 'https://cuentas-api.yosiftware.es',
        socialUrl: 'https://social.yosiftware.es'
    }
};
