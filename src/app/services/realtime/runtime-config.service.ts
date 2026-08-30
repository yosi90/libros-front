import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import type { CapacitorHttpPlugin } from '@capacitor/core/types/core-plugins';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NATIVE_HTTP } from '../native/native-session-transport.adapter';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

export interface ApiRuntimeConfig {
    baseUrl: string;
    environmentId: string;
    qaDatasetVersion: string | null;
    realtimeWsUrl: string;
}

export interface FirebaseRuntimeConfig {
    enabled: boolean;
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    appId: string;
    messagingSenderId: string;
    databaseURL: string;
    vapidKey: string;
    useEmulators: boolean;
    providers: {
        password: boolean;
        google: boolean;
        phone: boolean;
    };
    phoneTestingMode: boolean;
}

interface RuntimeConfigDocument {
    success: boolean;
    Environment: 'local' | 'qa' | 'produccion';
    QaDatasetVersion: string | null;
    RealtimeWsUrl: string;
    Firebase: {
        ApiKey?: string;
        AuthDomain?: string;
        ProjectId?: string;
        StorageBucket?: string;
        MessagingSenderId?: string;
        AppId?: string;
        DatabaseURL?: string;
        VapidKey?: string;
        Providers?: {
            Password?: boolean;
            Google?: boolean;
            Phone?: boolean;
        };
        PhoneTestingMode?: boolean;
    };
}

const defaultApiConfig: ApiRuntimeConfig = {
    baseUrl: environment.apiUrl,
    environmentId: '',
    qaDatasetVersion: null,
    realtimeWsUrl: ''
};

const defaultFirebaseConfig: FirebaseRuntimeConfig = {
    enabled: false,
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    appId: '',
    messagingSenderId: '',
    databaseURL: '',
    vapidKey: '',
    useEmulators: false,
    providers: { password: false, google: false, phone: false },
    phoneTestingMode: false
};

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
    private readonly nativeCacheKey = `runtimeConfig:${environment.runtimeConfigUrl}`;
    private apiConfig = defaultApiConfig;
    private firebaseConfig = defaultFirebaseConfig;

    constructor(
        private http: HttpClient,
        @Inject(NATIVE_HTTP) private nativeHttp: CapacitorHttpPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    async load(): Promise<void> {
        const cached = this.nativeMobile ? this.readNativeCache() : null;
        if (cached?.success) {
            this.applyDocument(cached);
            // La configuración es pública y puede reutilizarse para pintar el
            // arranque. Se revalida sin volver a bloquear el WebView.
            void this.loadDocument().then(document => {
                if (!document?.success) return;
                this.writeNativeCache(document);
                this.applyDocument(document);
            });
            return;
        }

        const document = await this.loadDocument();

        if (!document?.success) {
            this.apiConfig = defaultApiConfig;
            this.firebaseConfig = defaultFirebaseConfig;
            return;
        }

        this.writeNativeCache(document);
        this.applyDocument(document);
    }

    private applyDocument(document: RuntimeConfigDocument): void {

        this.apiConfig = {
            baseUrl: this.withTrailingSlash(environment.apiUrl),
            environmentId: document.Environment,
            qaDatasetVersion: document.QaDatasetVersion,
            realtimeWsUrl: document.RealtimeWsUrl
        };

        const firebase = document.Firebase ?? {};
        this.firebaseConfig = {
            enabled: this.hasRequiredFirebaseConfig(firebase),
            apiKey: firebase.ApiKey ?? '',
            authDomain: firebase.AuthDomain ?? '',
            projectId: firebase.ProjectId ?? '',
            storageBucket: firebase.StorageBucket ?? '',
            appId: firebase.AppId ?? '',
            messagingSenderId: firebase.MessagingSenderId ?? '',
            databaseURL: firebase.DatabaseURL ?? '',
            vapidKey: firebase.VapidKey ?? '',
            useEmulators: false,
            providers: {
                password: firebase.Providers?.Password === true,
                google: firebase.Providers?.Google === true,
                phone: firebase.Providers?.Phone === true
            },
            phoneTestingMode: firebase.PhoneTestingMode === true
        };
    }

    get firebase(): FirebaseRuntimeConfig {
        return this.firebaseConfig;
    }

    get api(): ApiRuntimeConfig {
        return this.apiConfig;
    }

    private async loadDocument(): Promise<RuntimeConfigDocument | null> {
        if (this.nativeMobile) {
            try {
                const response = await this.nativeHttp.request({
                    method: 'GET',
                    url: environment.runtimeConfigUrl,
                    responseType: 'json',
                    connectTimeout: 12_000,
                    readTimeout: 20_000
                });
                return response.status >= 200 && response.status < 300
                    ? response.data as RuntimeConfigDocument
                    : null;
            } catch {
                return null;
            }
        }

        return firstValueFrom(
            this.http.get<RuntimeConfigDocument>(environment.runtimeConfigUrl).pipe(
                timeout(12_000),
                catchError(() => of<RuntimeConfigDocument | null>(null))
            )
        );
    }

    private withTrailingSlash(value: string): string {
        return value.endsWith('/') ? value : `${value}/`;
    }

    private readNativeCache(): RuntimeConfigDocument | null {
        try {
            const value = localStorage.getItem(this.nativeCacheKey);
            return value ? JSON.parse(value) as RuntimeConfigDocument : null;
        } catch {
            return null;
        }
    }

    private writeNativeCache(document: RuntimeConfigDocument): void {
        if (!this.nativeMobile)
            return;
        try { localStorage.setItem(this.nativeCacheKey, JSON.stringify(document)); }
        catch { /* La configuración volverá a pedirse en el siguiente arranque. */ }
    }

    private hasRequiredFirebaseConfig(firebase: RuntimeConfigDocument['Firebase']): boolean {
        return !!firebase.ApiKey
            && !!firebase.AuthDomain
            && !!firebase.ProjectId
            && !!firebase.AppId
            && !!firebase.MessagingSenderId
            && !!firebase.DatabaseURL;
    }
}
