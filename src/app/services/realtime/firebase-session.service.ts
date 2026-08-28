import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, inMemoryPersistence, setPersistence, signInWithCustomToken, signOut } from 'firebase/auth';
import { Database, connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { Messaging, getMessaging } from 'firebase/messaging';
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { RuntimeConfigService } from './runtime-config.service';

interface FirebaseTokenResponse {
    success: boolean;
    token: string;
    uid: string;
    expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class FirebaseSessionService {
    private readonly appName = 'libros-canonical-session';
    private app: FirebaseApp | null = null;
    private authInstance: Auth | null = null;
    private firestoreInstance: Firestore | null = null;
    private databaseInstance: Database | null = null;
    private messagingInstance: Messaging | null = null;
    private emulatorsConnected = false;

    constructor(private http: HttpClient, private runtimeConfig: RuntimeConfigService) { }

    get enabled(): boolean {
        return this.runtimeConfig.firebase.enabled;
    }

    get auth(): Auth | null { return this.authInstance; }
    get appInstance(): FirebaseApp | null { return this.app; }
    get firestore(): Firestore | null { return this.firestoreInstance; }
    get database(): Database | null { return this.databaseInstance; }
    get messaging(): Messaging | null {
        if (!this.app)
            return null;
        this.messagingInstance ??= getMessaging(this.app);
        return this.messagingInstance;
    }

    startForUser(userId: number): Observable<void> {
        if (!this.enabled)
            return of(void 0);

        return from(this.initialize()).pipe(
            tap(() => this.observeQa('initialized')),
            switchMap(() => this.http.post<FirebaseTokenResponse>(`${environment.apiUrl}auth/firebase-custom-token`, {}).pipe(
                tap(response => this.observeQa('custom-token-received', response.uid === `libros:${userId}` && typeof response.token === 'string' && response.token.length > 0))
            )),
            switchMap(response => from(signInWithCustomToken(this.authInstance!, response.token)).pipe(
                map(credential => {
                    const expectedUid = `libros:${userId}`;
                    if (response.uid !== expectedUid || credential.user.uid !== expectedUid)
                        throw new Error('El custom token de Firebase no coincide con la sesión actual');
                    this.observeQa('authenticated', true);
                })
            )),
            catchError(error => {
                this.observeQa('error', false, typeof error?.code === 'string' ? error.code : 'unknown');
                return throwError(() => error);
            })
        );
    }

    clear(): void {
        if (this.authInstance)
            void signOut(this.authInstance);
    }

    private observeQa(stage: 'initialized' | 'custom-token-received' | 'authenticated' | 'error', canonicalUidValid?: boolean, errorCode?: string): void {
        if (environment.environmentName !== 'qa' || typeof window === 'undefined')
            return;
        window.dispatchEvent(new CustomEvent('libros:qa-firebase-session-observation', {
            detail: { stage, canonicalUidValid, errorCode }
        }));
    }

    private async initialize(): Promise<void> {
        if (this.app)
            return;

        const config = this.runtimeConfig.firebase;
        if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId || !config.messagingSenderId || !config.databaseURL)
            throw new Error('La configuración pública de Firebase está incompleta');

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
        await setPersistence(this.authInstance, inMemoryPersistence);
        this.firestoreInstance = getFirestore(this.app);
        this.databaseInstance = getDatabase(this.app);

        if (config.useEmulators && !this.emulatorsConnected) {
            connectAuthEmulator(this.authInstance, 'http://localhost:9099', { disableWarnings: true });
            connectFirestoreEmulator(this.firestoreInstance, 'localhost', 8080);
            connectDatabaseEmulator(this.databaseInstance, 'localhost', 9000);
            this.emulatorsConnected = true;
        }
    }
}
