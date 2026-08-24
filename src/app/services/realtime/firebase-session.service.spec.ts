import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { FirebaseSessionService } from './firebase-session.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('FirebaseSessionService', () => {
    afterEach(async () => {
        await Promise.all(getApps()
            .filter(app => ['libros-provider-auth', 'libros-canonical-session'].includes(app.name))
            .map(app => deleteApp(app)));
    });

    it('does not initialize Firebase when runtime configuration disables it', () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                FirebaseSessionService,
                { provide: RuntimeConfigService, useValue: { firebase: { enabled: false } } }
            ]
        });

        const service = TestBed.inject(FirebaseSessionService);
        service.startForUser(7).subscribe(value => expect(value).toBeUndefined());
        expect(service.auth).toBeNull();
    });

    it('initializes its named canonical app when the provider app already exists', async () => {
        const firebase = {
            enabled: true,
            apiKey: 'test-api-key',
            authDomain: 'example.test',
            projectId: 'test-project',
            storageBucket: 'test-project.appspot.com',
            appId: '1:test:web:test',
            messagingSenderId: '1',
            databaseURL: 'https://test-project-default-rtdb.europe-west1.firebasedatabase.app',
            vapidKey: '',
            useEmulators: false,
            providers: { password: true, google: true, phone: true },
            phoneTestingMode: false
        };
        initializeApp(firebase, 'libros-provider-auth');
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                FirebaseSessionService,
                { provide: RuntimeConfigService, useValue: { firebase } }
            ]
        });

        const service = TestBed.inject(FirebaseSessionService);
        await (service as unknown as { initialize(): Promise<void> }).initialize();

        expect(service.appInstance?.name).toBe('libros-canonical-session');
        expect(service.auth?.app.name).toBe('libros-canonical-session');
    });
});
