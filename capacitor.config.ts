import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'es.yosiftware.libros',
    appName: 'Memoria Bibliográfica',
    webDir: 'dist/book-front/browser',
    server: {
        hostname: 'localhost',
        androidScheme: 'https'
    },
    plugins: {
        CapacitorHttp: {
            enabled: true
        },
        CapacitorCookies: {
            enabled: true
        },
        FirebaseAuthentication: {
            skipNativeAuth: false,
            providers: ['google.com', 'phone']
        },
        PushNotifications: {
            presentationOptions: []
        }
    }
};

export default config;
