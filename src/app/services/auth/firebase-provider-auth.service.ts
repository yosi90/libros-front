import { Injectable } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
    Auth,
    ConfirmationResult,
    GoogleAuthProvider,
    RecaptchaVerifier,
    User,
    createUserWithEmailAndPassword,
    applyActionCode,
    confirmPasswordReset,
    getAuth,
    getRedirectResult,
    inMemoryPersistence,
    sendEmailVerification,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    updatePassword,
    verifyBeforeUpdateEmail,
    verifyPasswordResetCode
} from 'firebase/auth';
import { RuntimeConfigService } from '../realtime/runtime-config.service';

export type GoogleSignInMode = 'popup' | 'redirect';

@Injectable({ providedIn: 'root' })
export class FirebaseProviderAuthService {
    private readonly appName = 'libros-provider-auth';
    private app: FirebaseApp | null = null;
    private authInstance: Auth | null = null;
    private confirmation: ConfirmationResult | null = null;
    private recaptcha: RecaptchaVerifier | null = null;
    private initialization: Promise<Auth> | null = null;

    constructor(private runtimeConfig: RuntimeConfigService) { }

    get enabled(): boolean { return this.runtimeConfig.firebase.enabled; }
    get providers() { return this.runtimeConfig.firebase.providers; }
    get currentUser(): User | null { return this.authInstance?.currentUser ?? null; }

    async signInPassword(email: string, password: string): Promise<string> {
        const auth = await this.initialize();
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return credential.user.getIdToken(true);
    }

    async createPassword(email: string, password: string): Promise<{ user: User; idToken: string }> {
        const auth = await this.initialize();
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: credential.user, idToken: await credential.user.getIdToken(true) };
    }

    async signInGoogle(mode: GoogleSignInMode): Promise<string | null> {
        const auth = await this.initialize();
        const provider = this.googleProvider();
        if (mode === 'redirect') {
            await signInWithRedirect(auth, provider);
            return null;
        }
        const credential = await signInWithPopup(auth, provider);
        return credential.user.getIdToken(true);
    }

    async consumeGoogleRedirect(): Promise<string | null> {
        const auth = await this.initialize();
        const credential = await getRedirectResult(auth);
        return credential ? credential.user.getIdToken(true) : null;
    }

    async startPhone(phone: string, container: HTMLElement | string): Promise<void> {
        const auth = await this.initialize();
        this.clearRecaptcha();
        this.recaptcha = new RecaptchaVerifier(auth, container, { size: 'normal' });
        this.confirmation = await signInWithPhoneNumber(auth, phone, this.recaptcha);
    }

    async confirmPhone(code: string): Promise<string> {
        if (!this.confirmation)
            throw new Error('Solicita primero un código de acceso.');
        const credential = await this.confirmation.confirm(code);
        this.confirmation = null;
        this.clearRecaptcha();
        return credential.user.getIdToken(true);
    }

    async sendVerification(user: User = this.requireUser()): Promise<void> {
        const auth = await this.initialize();
        auth.languageCode = 'es';
        await sendEmailVerification(user, { url: `${location.origin}/verify-email` });
    }

    async sendPasswordReset(email: string): Promise<void> {
        const auth = await this.initialize();
        auth.languageCode = 'es';
        await sendPasswordResetEmail(auth, email, { url: `${location.origin}/reset-password` });
    }

    async inspectPasswordResetCode(code: string): Promise<string> {
        return verifyPasswordResetCode(await this.initialize(), code);
    }

    async confirmPasswordResetCode(code: string, password: string): Promise<void> {
        await confirmPasswordReset(await this.initialize(), code, password);
    }

    async confirmEmailVerification(code: string): Promise<void> {
        await applyActionCode(await this.initialize(), code);
    }

    async changePassword(password: string): Promise<void> {
        await updatePassword(this.requireUser(), password);
    }

    async requestEmailChange(email: string): Promise<void> {
        await verifyBeforeUpdateEmail(this.requireUser(), email, { url: `${location.origin}/verify-email` });
    }

    async freshIdToken(): Promise<string> {
        return this.requireUser().getIdToken(true);
    }

    async clear(): Promise<void> {
        this.confirmation = null;
        this.clearRecaptcha();
        if (this.authInstance)
            await signOut(this.authInstance);
    }

    private initialize(): Promise<Auth> {
        this.initialization ??= this.createAuth();
        return this.initialization;
    }

    private async createAuth(): Promise<Auth> {
        const config = this.runtimeConfig.firebase;
        if (!config.enabled)
            throw new Error('Firebase Authentication no está disponible en este entorno.');

        this.app = getApps().some(app => app.name === this.appName)
            ? getApp(this.appName)
            : initializeApp({
                apiKey: config.apiKey,
                authDomain: config.authDomain,
                projectId: config.projectId,
                storageBucket: config.storageBucket,
                appId: config.appId,
                messagingSenderId: config.messagingSenderId,
                databaseURL: config.databaseURL
            }, this.appName);
        this.authInstance = getAuth(this.app);
        this.authInstance.languageCode = 'es';
        this.authInstance.settings.appVerificationDisabledForTesting = config.phoneTestingMode;
        await setPersistence(this.authInstance, inMemoryPersistence);
        return this.authInstance;
    }

    private googleProvider(): GoogleAuthProvider {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ prompt: 'select_account' });
        return provider;
    }

    private requireUser(): User {
        const user = this.currentUser;
        if (!user)
            throw new Error('Debes autenticarte de nuevo para continuar.');
        return user;
    }

    private clearRecaptcha(): void {
        this.recaptcha?.clear();
        this.recaptcha = null;
    }
}
