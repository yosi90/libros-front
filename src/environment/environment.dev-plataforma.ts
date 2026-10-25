// Web de desarrollo en https://libros.dev.yosiftware.es contra la plataforma de QA (MIGRACION.md, paso 7).
// La API de QA de Libros (127.0.0.1:5101) llega por el proxy del servidor de desarrollo
// (proxy.dev-plataforma.json), del mismo origen que la web: sin CORS.
export const environment = {
    production: false,
    environmentName: 'desarrollo',
    mobilePresentationEnabled: true,
    webPresentationEnabled: true,
    sessionVersion: '2026-10-24-adhesion-yosiftware',
    clientVersion: '1.0.0',
    apiUrl: '/api/',
    getImgUrl: '/api/image/get/',
    plataforma: {
        sdkUrl: 'https://qa-cuentas.yosiftware.es/sdk/v1/yosiftware.js',
        apiUrl: 'https://qa-cuentas-api.yosiftware.es',
        socialUrl: 'https://qa-social.yosiftware.es'
    }
};
