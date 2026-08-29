import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Subject, distinctUntilChanged, fromEvent, map, merge, of, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
    private readonly browser: boolean;
    private readonly onlineSignal = signal(true);
    private readonly nativeStatus = new Subject<boolean>();

    readonly online = this.onlineSignal.asReadonly();
    readonly online$;

    constructor(@Inject(PLATFORM_ID) platformId: object) {
        this.browser = isPlatformBrowser(platformId);
        const initial = !this.browser || navigator.onLine;
        this.onlineSignal.set(initial);

        this.online$ = this.browser
            ? merge(
                of(initial),
                fromEvent(window, 'online').pipe(map(() => true)),
                fromEvent(window, 'offline').pipe(map(() => false)),
                this.nativeStatus
            ).pipe(
                distinctUntilChanged(),
                shareReplay({ bufferSize: 1, refCount: true })
            )
            : of(true);

        this.online$.subscribe(online => this.onlineSignal.set(online));
    }

    retry(): void {
        if (!this.browser)
            return;
        if (this.onlineSignal())
            window.location.reload();
    }

    setNativeOnline(online: boolean): void {
        if (this.browser)
            this.nativeStatus.next(online);
    }
}
