import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type LoaderContext = 'default' | 'login' | 'book';

export interface LoaderState {
    active: boolean;
    context: LoaderContext;
}

@Injectable({
    providedIn: 'root'
})
export class LoaderEmmitterService {

    private loaderStatusSubject = new BehaviorSubject<LoaderState>({ active: false, context: 'default' });
    loaderStatus$ = this.loaderStatusSubject.asObservable();

    public activateLoader(context: LoaderContext = 'default'): void {
        const current = this.loaderStatusSubject.value;
        if (current.active && current.context === context)
            return;
        this.loaderStatusSubject.next({ active: true, context });
    }

    public deactivateLoader(): void {
        if (this.loaderStatusSubject.value.active === true)
            this.loaderStatusSubject.next({ active: false, context: 'default' });
    }
}
