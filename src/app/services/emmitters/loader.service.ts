import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoaderEmmitterService {

    private loaderStatusSubject = new BehaviorSubject<boolean>(false);
    loaderStatus$ = this.loaderStatusSubject.asObservable();

    public activateLoader(): void {
        this.loaderStatusSubject.next(true);
    }

    public deactivateLoader(): void {
        if (this.loaderStatusSubject.value === true)
            this.loaderStatusSubject.next(false);
    }
}
