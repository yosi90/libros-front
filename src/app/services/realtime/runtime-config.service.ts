import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { environment } from '../../../environment/environment';

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
    useEmulators: false
};

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
    private apiConfig = defaultApiConfig;
    private firebaseConfig = defaultFirebaseConfig;

    constructor(private http: HttpClient) { }

    async load(): Promise<void> {
        const document = await firstValueFrom(
            this.http.get<RuntimeConfigDocument>(environment.runtimeConfigUrl).pipe(
                catchError(() => of<RuntimeConfigDocument | null>(null))
            )
        );

        if (!document?.success) {
            this.apiConfig = defaultApiConfig;
            this.firebaseConfig = defaultFirebaseConfig;
            return;
        }

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
            useEmulators: false
        };
    }

    get firebase(): FirebaseRuntimeConfig {
        return this.firebaseConfig;
    }

    get api(): ApiRuntimeConfig {
        return this.apiConfig;
    }

    private withTrailingSlash(value: string): string {
        return value.endsWith('/') ? value : `${value}/`;
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
