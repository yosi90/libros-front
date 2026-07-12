import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

export interface FirebaseRuntimeConfig {
    enabled: boolean;
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    messagingSenderId: string;
    databaseURL: string;
    vapidKey: string;
    useEmulators: boolean;
}

interface RuntimeConfigDocument {
    firebase?: Partial<FirebaseRuntimeConfig>;
}

const defaultFirebaseConfig: FirebaseRuntimeConfig = {
    enabled: false,
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
    messagingSenderId: '',
    databaseURL: '',
    vapidKey: '',
    useEmulators: false
};

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
    private firebaseConfig = defaultFirebaseConfig;

    constructor(private http: HttpClient) { }

    async load(): Promise<void> {
        const document = await firstValueFrom(
            this.http.get<RuntimeConfigDocument>('assets/runtime-config.json').pipe(
                catchError(() => of<RuntimeConfigDocument>({}))
            )
        );

        this.firebaseConfig = {
            ...defaultFirebaseConfig,
            ...document.firebase
        };
    }

    get firebase(): FirebaseRuntimeConfig {
        return this.firebaseConfig;
    }
}
