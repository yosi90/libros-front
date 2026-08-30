import { Inject, Injectable, InjectionToken, inject } from '@angular/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import type { FirebaseAuthenticationPlugin } from '@capacitor-firebase/authentication';
import type { PluginListenerHandle } from '@capacitor/core';
import type { AppPlugin } from '@capacitor/app';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { NATIVE_APP_PLUGIN } from './native-app-links.service';

export type NativePhoneChallenge =
    | { state: 'code_sent'; verificationId: string }
    | { state: 'verified'; idToken: string };

export const NATIVE_FIREBASE_AUTH = new InjectionToken<FirebaseAuthenticationPlugin>('NATIVE_FIREBASE_AUTH', {
    providedIn: 'root',
    factory: () => inject(NATIVE_MOBILE_PLATFORM)
        ? FirebaseAuthentication
        : {} as FirebaseAuthenticationPlugin
});

@Injectable({ providedIn: 'root' })
export class NativeFirebaseAuthAdapter {
    constructor(
        @Inject(NATIVE_FIREBASE_AUTH) private auth: FirebaseAuthenticationPlugin,
        @Inject(NATIVE_APP_PLUGIN) private app: AppPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    async signInPassword(email: string, password: string): Promise<string> {
        this.assertNative();
        await this.auth.signInWithEmailAndPassword({ email, password });
        return this.freshIdToken();
    }

    async signInGoogle(): Promise<string> {
        this.assertNative();
        // La instancia nativa conserva la ultima identidad de proveedor entre
        // aperturas. Nunca puede reutilizarse como prueba de un login nuevo: el
        // usuario debe elegir Google de forma explicita en cada intento.
        await this.auth.signOut();

        let listener: PluginListenerHandle | undefined;
        let resumeListener: PluginListenerHandle | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const stateChange = new Promise<string>(async (resolve, reject) => {
            try {
                listener = await this.auth.addListener('authStateChange', event => {
                    if (event.user)
                        void this.freshIdToken().then(resolve, reject);
                });
            } catch (error) {
                reject(error);
            }
        });
        // Credential Manager ya entrega el Google ID token con la identidad básica.
        // Pasar `scopes` al plugin inicia además AuthorizationClient con acceso
        // offline, innecesario para nuestro intercambio de Firebase y sujeto a un
        // consentimiento OAuth distinto.
        const interactive = this.auth.signInWithGoogle({
            useCredentialManager: true
        }).then(() => this.freshIdToken());
        const resumed = new Promise<string>(async (resolve, reject) => {
            try {
                resumeListener = await this.app.addListener('resume', () => {
                    setTimeout(() => {
                        void this.auth.getCurrentUser()
                            .then(result => result.user ? this.freshIdToken().then(resolve, reject) : undefined)
                            .catch(reject);
                    }, 250);
                });
            } catch (error) {
                reject(error);
            }
        });
        const timeout = new Promise<string>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Google no devolvió el control a la aplicación.')), 30_000);
        });

        try {
            return await Promise.race([interactive, stateChange, resumed, timeout]);
        } finally {
            if (timeoutId)
                clearTimeout(timeoutId);
            await listener?.remove();
            await resumeListener?.remove();
        }
    }

    async startPhone(phoneNumber: string): Promise<NativePhoneChallenge> {
        this.assertNative();
        // Evita que una identidad Google/password conservada por Firebase
        // contamine el reto telefonico que acaba de solicitar el usuario.
        await this.auth.signOut();
        const handles: PluginListenerHandle[] = [];
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let settled = false;
        let resolveChallenge!: (result: NativePhoneChallenge) => void;
        let rejectChallenge!: (error: Error) => void;
        const challenge = new Promise<NativePhoneChallenge>((resolve, reject) => {
            resolveChallenge = resolve;
            rejectChallenge = reject;
        });
        const finish = (result: NativePhoneChallenge): void => {
            if (settled)
                return;
            settled = true;
            resolveChallenge(result);
        };
        const fail = (message: string): void => {
            if (settled)
                return;
            settled = true;
            rejectChallenge(new Error(message));
        };

        try {
            handles.push(await this.auth.addListener('phoneCodeSent', event =>
                finish({ state: 'code_sent', verificationId: event.verificationId })));
            handles.push(await this.auth.addListener('phoneVerificationCompleted', () => {
                void this.freshIdToken()
                    .then(idToken => finish({ state: 'verified', idToken }))
                    .catch(error => fail(error instanceof Error ? error.message : 'No se pudo completar la verificación telefónica.'));
            }));
            handles.push(await this.auth.addListener('phoneVerificationFailed', event => fail(event.message)));
            timeoutId = setTimeout(() => fail('Android no completó la verificación telefónica.'), 75_000);
            await this.auth.signInWithPhoneNumber({ phoneNumber, timeout: 60 });
            return await challenge;
        } finally {
            if (timeoutId)
                clearTimeout(timeoutId);
            await this.removeListeners(handles);
        }
    }

    async confirmPhone(verificationId: string, verificationCode: string): Promise<string> {
        this.assertNative();
        await this.auth.confirmVerificationCode({ verificationId, verificationCode });
        return this.freshIdToken();
    }

    async signInCanonical(customToken: string): Promise<void> {
        this.assertNative();
        await this.auth.signInWithCustomToken({ token: customToken });
    }

    async freshIdToken(): Promise<string> {
        this.assertNative();
        const result = await this.auth.getIdToken({ forceRefresh: true });
        if (!result.token)
            throw new Error('Firebase no devolvió una prueba de identidad válida.');
        return result.token;
    }

    async signOut(): Promise<void> {
        if (this.nativeMobile)
            await this.auth.signOut();
    }

    private assertNative(): void {
        if (!this.nativeMobile)
            throw new Error('El adaptador Firebase nativo solo está disponible dentro de Android.');
    }

    private async removeListeners(handles: PluginListenerHandle[]): Promise<void> {
        await Promise.all(handles.splice(0).map(handle => handle.remove()));
    }
}
