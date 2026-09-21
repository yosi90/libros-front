import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BookSaveIndicatorService {
    readonly visibleBookId = signal<number | null>(null);

    private hideTimer: ReturnType<typeof setTimeout> | null = null;

    notifySaved(bookId: number): void {
        if (!bookId)
            return;

        if (this.hideTimer)
            clearTimeout(this.hideTimer);

        this.visibleBookId.set(bookId);
        this.hideTimer = setTimeout(() => {
            this.visibleBookId.set(null);
            this.hideTimer = null;
        }, 3000);
    }

    isVisibleFor(bookId: number): boolean {
        return this.visibleBookId() === bookId;
    }
}
