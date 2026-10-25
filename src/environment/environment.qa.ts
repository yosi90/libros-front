export const environment = {
    production: false,
    environmentName: 'qa',
    mobilePresentationEnabled: true,
    webPresentationEnabled: true,
    // Cambios incompatibles de la web o de la API: limpia lo guardado por versiones anteriores.
    sessionVersion: '2026-10-24-adhesion-yosiftware',
    clientVersion: '1.0.0',
    apiUrl: 'https://qa-api.yosiftware.es/',
    getImgUrl: 'https://qa-api.yosiftware.es/image/get/',
    // La cuenta y la sesión son de la plataforma Yosiftware de QA (ecosistema-kit/ACCESO.md).
    plataforma: {
        sdkUrl: 'https://qa-cuentas.yosiftware.es/sdk/v1/yosiftware.js',
        apiUrl: 'https://qa-cuentas-api.yosiftware.es',
        socialUrl: 'https://qa-social.yosiftware.es'
    }
};
