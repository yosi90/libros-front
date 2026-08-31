import { Inject, Injectable, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { NativeReaderBookSummary, NativeReaderSessionState, PersistedNativeReaderSession } from '../../interfaces/native-reader';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { SessionService } from '../auth/session.service';
import { BookService } from '../entities/book.service';
import { BookStoreService } from '../stores/book-store.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { NativeReaderRouteReuseStrategy } from './native-reader-route-reuse.strategy';

const INITIAL_STATE: NativeReaderSessionState = {
    mode: 'closed', transition: 'idle', bookId: null, bookName: '', coverUrl: '',
    readerUrl: null, backgroundUrl: '/dashboard/books', saving: false
};

@Injectable({ providedIn: 'root' })
export class NativeReaderSessionService {
    private readonly stateSignal = signal<NativeReaderSessionState>(INITIAL_STATE);
    private actorId: number | null = null;
    private readerHistory: string[] = [];
    private restorationGeneration = 0;

    readonly state = this.stateSignal.asReadonly();

    constructor(
        private router: Router,
        private session: SessionService,
        private books: BookStoreService,
        private bookApi: BookService,
        private reuse: NativeReaderRouteReuseStrategy,
        private toasts: AppToastService,
        @Inject(NATIVE_MOBILE_PLATFORM) readonly supported: boolean
    ) {
        if (!supported) return;
        this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => this.observeNavigation(event.urlAfterRedirects));
        this.router.events.pipe(filter(event => event instanceof NavigationCancel || event instanceof NavigationError)).subscribe(() => this.navigationFailed());
        this.session.userIsLogged$.subscribe(logged => logged ? void this.restorePersistedSession() : this.clearForLogout());
    }

    async open(bookId: number, childPath = 'statistics', summary?: NativeReaderBookSummary): Promise<boolean> {
        if (!this.supported) return this.router.navigate(['/book', bookId, childPath]);
        if (!Number.isInteger(bookId) || bookId < 1 || this.state().transition !== 'idle') return false;
        // La intención explícita de la persona prevalece sobre cualquier
        // recuperación API que siga pendiente desde el arranque.
        this.restorationGeneration++;
        if (this.state().mode === 'minimized' && this.state().bookId === bookId) {
            this.applySummary(summary);
            return this.restore();
        }
        if (this.state().mode !== 'closed') {
            const closed = await this.close();
            if (!closed) return false;
        }
        const backgroundUrl = this.isDashboardUrl(this.router.url) ? this.router.url : '/dashboard/books';
        const readerUrl = `/book/${bookId}/${childPath}`;
        this.reuse.preserveDashboardOnNextNavigation();
        this.patch({
            transition: 'opening', bookId, readerUrl, backgroundUrl,
            bookName: summary?.bookName ?? '', coverUrl: summary?.coverUrl ?? ''
        });
        const navigated = await this.router.navigateByUrl(readerUrl);
        if (!navigated) this.navigationFailed();
        return navigated;
    }

    async minimize(): Promise<boolean> {
        const current = this.state();
        if (!this.supported || current.mode !== 'expanded' || current.transition !== 'idle') return false;
        this.reuse.preserveBookOnNextNavigation();
        this.patch({ transition: 'minimizing', saving: true, readerUrl: this.router.url });
        const navigated = await this.router.navigateByUrl(current.backgroundUrl);
        if (!navigated) {
            this.reuse.cancelPendingPreservation();
            this.patch({ transition: 'idle', saving: false });
            return false;
        }
        this.patch({ mode: 'minimized', transition: 'idle', saving: false });
        this.persist();
        return true;
    }

    async restore(): Promise<boolean> {
        const current = this.state();
        if (!this.supported || current.mode !== 'minimized' || !current.readerUrl || current.transition !== 'idle') return false;
        const backgroundUrl = this.isDashboardUrl(this.router.url) ? this.router.url : current.backgroundUrl;
        this.reuse.preserveDashboardOnNextNavigation();
        this.patch({ transition: 'restoring', backgroundUrl });
        const navigated = await this.router.navigateByUrl(current.readerUrl);
        if (!navigated) this.navigationFailed();
        return navigated;
    }

    async close(): Promise<boolean> {
        const current = this.state();
        if (!this.supported || current.mode === 'closed' || current.transition !== 'idle') return false;
        if (current.mode === 'minimized') {
            this.patch({ transition: 'closing' });
            this.reuse.discardBook();
            this.finishClose();
            return true;
        }
        this.patch({ transition: 'closing', saving: true });
        const navigated = await this.router.navigateByUrl(current.backgroundUrl);
        if (!navigated) {
            this.patch({ transition: 'idle', saving: false });
            return false;
        }
        this.reuse.discardBook();
        this.finishClose();
        return true;
    }

    handleNativeBack(): boolean {
        const current = this.state();
        if (!this.supported || current.mode !== 'expanded') return false;
        if (this.readerHistory.length > 1) {
            this.readerHistory.pop();
            void this.router.navigateByUrl(this.readerHistory[this.readerHistory.length - 1], { replaceUrl: true });
        } else {
            void this.minimize();
        }
        return true;
    }

    private observeNavigation(url: string): void {
        const match = this.bookRoute(url);
        if (match) {
            const book = this.books.getBook();
            const current = this.state();
            if (this.readerHistory[this.readerHistory.length - 1] !== url) this.readerHistory.push(url);
            this.patch({
                mode: 'expanded', transition: 'idle', saving: false, bookId: match.bookId,
                bookName: book.Id === match.bookId ? book.Nombre : current.bookName,
                coverUrl: book.Id === match.bookId ? book.Portada : current.coverUrl,
                readerUrl: url, backgroundUrl: current.backgroundUrl || '/dashboard/books'
            });
            this.persist();
        } else if (this.isDashboardUrl(url)) {
            if (this.state().transition === 'opening') {
                this.reuse.cancelPendingPreservation();
                this.stateSignal.set({ ...INITIAL_STATE, backgroundUrl: url });
            } else if (this.state().mode === 'minimized') {
                this.patch({ backgroundUrl: url });
            }
        }
    }

    private async restorePersistedSession(): Promise<void> {
        if (!this.supported || !this.session.canAccessLibrary || this.actorId === this.session.userId) return;
        this.actorId = this.session.userId;
        const restorationGeneration = ++this.restorationGeneration;
        const persisted = this.readPersisted(this.actorId);
        if (!persisted) return;
        try {
            const book = await firstValueFrom(this.bookApi.getBook(persisted.bookId));
            if (restorationGeneration !== this.restorationGeneration
                || this.actorId !== persisted.actorId
                || this.session.userId !== persisted.actorId
                || !this.session.canAccessLibrary)
                return;
            this.books.setBook(book);
            this.patch({ mode: 'minimized', bookId: book.Id, bookName: book.Nombre, coverUrl: book.Portada, readerUrl: persisted.readerUrl, backgroundUrl: '/dashboard/books' });
        } catch {
            this.removePersisted(this.actorId);
            this.toasts.showInfo('El último libro abierto ya no está disponible.', { title: 'Lector cerrado', dedupeKey: 'native-reader:restore:unavailable' });
        }
    }

    private navigationFailed(): void {
        this.reuse.cancelPendingPreservation();
        const current = this.state();
        if (current.transition === 'opening') {
            this.stateSignal.set({ ...INITIAL_STATE, backgroundUrl: current.backgroundUrl });
        } else if (current.transition === 'restoring') {
            this.patch({ mode: 'minimized', transition: 'idle', saving: false });
        } else {
            this.patch({ mode: 'expanded', transition: 'idle', saving: false });
        }
    }

    private finishClose(): void {
        if (this.actorId) this.removePersisted(this.actorId);
        this.readerHistory = [];
        this.stateSignal.set(INITIAL_STATE);
    }

    private clearForLogout(): void {
        if (!this.supported || this.actorId === null) return;
        this.restorationGeneration++;
        this.removePersisted(this.actorId);
        this.actorId = null;
        this.readerHistory = [];
        this.reuse.clear();
        this.stateSignal.set(INITIAL_STATE);
    }

    private persist(): void {
        const state = this.state();
        const actorId = this.session.userId;
        if (state.mode === 'closed' || !state.bookId || !state.readerUrl || actorId < 1) return;
        const value: PersistedNativeReaderSession = { version: 1, actorId, bookId: state.bookId, readerUrl: state.readerUrl, updatedAt: Date.now() };
        try { localStorage.setItem(this.storageKey(actorId), JSON.stringify(value)); } catch { /* La sesión en memoria sigue disponible. */ }
    }

    private readPersisted(actorId: number): PersistedNativeReaderSession | null {
        try {
            const parsed = JSON.parse(localStorage.getItem(this.storageKey(actorId)) ?? 'null') as Partial<PersistedNativeReaderSession> | null;
            if (!parsed || parsed.version !== 1 || parsed.actorId !== actorId || !Number.isInteger(parsed.bookId) || !this.bookRoute(parsed.readerUrl ?? '')) return null;
            return parsed as PersistedNativeReaderSession;
        } catch { return null; }
    }

    private removePersisted(actorId: number): void { try { localStorage.removeItem(this.storageKey(actorId)); } catch { /* Sin efecto funcional. */ } }
    private storageKey(actorId: number): string { return `book-front:native-reader:v1:${actorId}`; }
    private isDashboardUrl(url: string): boolean { return url.split('?')[0].startsWith('/dashboard'); }
    private bookRoute(url: string): { bookId: number } | null {
        const bookId = Number(url.split('?')[0].match(/^\/book\/(\d+)(?:\/|$)/)?.[1]);
        return Number.isInteger(bookId) && bookId > 0 ? { bookId } : null;
    }
    private applySummary(summary?: NativeReaderBookSummary): void {
        if (summary) this.patch({ bookName: summary.bookName, coverUrl: summary.coverUrl });
    }
    private patch(value: Partial<NativeReaderSessionState>): void { this.stateSignal.update(current => ({ ...current, ...value })); }
}
