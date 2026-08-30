import { TestBed } from '@angular/core/testing';
import type { FirebaseAuthenticationPlugin } from '@capacitor-firebase/authentication';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { NATIVE_FIREBASE_AUTH, NativeFirebaseAuthAdapter } from './native-firebase-auth.adapter';
import { NATIVE_APP_PLUGIN } from './native-app-links.service';

describe('NativeFirebaseAuthAdapter', () => {
    let auth: jasmine.SpyObj<FirebaseAuthenticationPlugin>;
    let adapter: NativeFirebaseAuthAdapter;
    let app: jasmine.SpyObj<any>;

    beforeEach(() => {
        auth = jasmine.createSpyObj<FirebaseAuthenticationPlugin>('FirebaseAuthentication', [
            'signInWithGoogle', 'signInWithEmailAndPassword', 'signInWithPhoneNumber',
            'confirmVerificationCode', 'signInWithCustomToken', 'getCurrentUser', 'getIdToken', 'signOut', 'addListener'
        ]);
        auth.getCurrentUser.and.resolveTo({ user: null });
        auth.getIdToken.and.resolveTo({ token: 'firebase-id-token' });
        app = jasmine.createSpyObj('App', ['addListener']);
        TestBed.configureTestingModule({
            providers: [
                NativeFirebaseAuthAdapter,
                { provide: NATIVE_FIREBASE_AUTH, useValue: auth },
                { provide: NATIVE_APP_PLUGIN, useValue: app },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true }
            ]
        });
        adapter = TestBed.inject(NativeFirebaseAuthAdapter);
    });

    it('obtiene la prueba Google nativa sin persistirla', async () => {
        auth.signInWithGoogle.and.resolveTo({ user: null, credential: null, additionalUserInfo: null });

        await expectAsync(adapter.signInGoogle()).toBeResolvedTo('firebase-id-token');

        expect(auth.signInWithGoogle).toHaveBeenCalledWith({
            useCredentialManager: true
        });
        expect(auth.signInWithGoogle.calls.mostRecent().args[0]).not.toEqual(jasmine.objectContaining({ scopes: jasmine.anything() }));
        expect(auth.getIdToken).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('obtiene la prueba de contraseña mediante el SDK nativo', async () => {
        auth.signInWithEmailAndPassword.and.resolveTo({ user: null, credential: null, additionalUserInfo: null });

        await expectAsync(adapter.signInPassword('reader@example.com', 'Secret1!')).toBeResolvedTo('firebase-id-token');

        expect(auth.signInWithEmailAndPassword).toHaveBeenCalledOnceWith({
            email: 'reader@example.com',
            password: 'Secret1!'
        });
    });

    it('reanuda el intercambio si Credential Manager ya autenticó al usuario', async () => {
        auth.getCurrentUser.and.resolveTo({ user: { uid: 'technical-user' } as never });

        await expectAsync(adapter.signInGoogle()).toBeResolvedTo('firebase-id-token');

        expect(auth.signInWithGoogle).not.toHaveBeenCalled();
        expect(auth.getIdToken).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('reanuda el intercambio al volver de Credential Manager aunque se pierda authStateChange', async () => {
        let resume: (() => void) | undefined;
        app.addListener.and.callFake(async (eventName: string, callback: () => void) => {
            if (eventName === 'resume') resume = callback;
            return { remove: async () => void 0 };
        });
        auth.getCurrentUser.and.returnValues(
            Promise.resolve({ user: null }),
            Promise.resolve({ user: { uid: 'technical-user' } as never })
        );
        auth.signInWithGoogle.and.returnValue(new Promise(() => void 0));

        const result = adapter.signInGoogle();
        await Promise.resolve();
        resume?.();

        await expectAsync(result).toBeResolvedTo('firebase-id-token');
    });

    it('resuelve el reto telefónico y retira todos los listeners', async () => {
        const listeners: Record<string, (event: any) => void> = {};
        const removals = [jasmine.createSpy('remove-code'), jasmine.createSpy('remove-completed'), jasmine.createSpy('remove-failed')];
        removals.forEach(remove => remove.and.resolveTo());
        let listenerIndex = 0;
        auth.addListener.and.callFake(async (eventName: string, callback: (event: any) => void) => {
            listeners[eventName] = callback;
            return { remove: removals[listenerIndex++] };
        });
        auth.signInWithPhoneNumber.and.callFake(async () => {
            listeners['phoneCodeSent']({ verificationId: 'verification-id' });
        });

        await expectAsync(adapter.startPhone('+34900000000')).toBeResolvedTo({
            state: 'code_sent',
            verificationId: 'verification-id'
        });

        expect(auth.signInWithPhoneNumber).toHaveBeenCalledOnceWith({ phoneNumber: '+34900000000', timeout: 60 });
        removals.forEach(remove => expect(remove).toHaveBeenCalled());
    });

    it('rechaza el reto telefónico si Android no puede registrar sus listeners', async () => {
        auth.addListener.and.rejectWith(new Error('listener unavailable'));

        await expectAsync(adapter.startPhone('+34900000000')).toBeRejectedWithError('listener unavailable');

        expect(auth.signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    it('confirma el código telefónico y devuelve una prueba fresca', async () => {
        auth.confirmVerificationCode.and.resolveTo({ user: null, credential: null, additionalUserInfo: null });

        await expectAsync(adapter.confirmPhone('verification-id', '123456')).toBeResolvedTo('firebase-id-token');

        expect(auth.confirmVerificationCode).toHaveBeenCalledOnceWith({
            verificationId: 'verification-id',
            verificationCode: '123456'
        });
    });

    it('rechaza su uso fuera de Capacitor', async () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                NativeFirebaseAuthAdapter,
                { provide: NATIVE_FIREBASE_AUTH, useValue: auth },
                { provide: NATIVE_APP_PLUGIN, useValue: app },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: false }
            ]
        });

        await expectAsync(TestBed.inject(NativeFirebaseAuthAdapter).signInGoogle())
            .toBeRejectedWithError(/solo está disponible dentro de Android/);
    });
});
