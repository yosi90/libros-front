import { Injectable } from '@angular/core';
import { Observable, catchError, from, map, of, shareReplay } from 'rxjs';
import { environment } from '../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class CoverCacheService {
    private readonly cacheName = 'libros-cover-cache-v1';
    private readonly fallbackUrl = 'assets/media/img/error.png';
    private readonly coverUrls = new Map<string, Observable<string>>();

    getCoverUrl(coverName: string | null | undefined): Observable<string> {
        const normalizedName = this.normalizeCoverName(coverName);
        if (!normalizedName)
            return of(this.fallbackUrl);

        const cached = this.coverUrls.get(normalizedName);
        if (cached)
            return cached;

        const coverUrl$ = from(this.loadCoverBlob(normalizedName)).pipe(
            map(blob => URL.createObjectURL(blob)),
            catchError(() => of(this.fallbackUrl)),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this.coverUrls.set(normalizedName, coverUrl$);
        return coverUrl$;
    }

    getCoverFile(coverName: string): Observable<File> {
        const normalizedName = this.normalizeCoverName(coverName);
        if (!normalizedName)
            return new Observable(observer => observer.error(new Error('Portada invalida')));

        return from(this.loadCoverBlob(normalizedName)).pipe(
            map(blob => new File([blob], normalizedName, { type: blob.type || 'image/png' }))
        );
    }

    invalidateCover(coverName: string | null | undefined): void {
        const normalizedName = this.normalizeCoverName(coverName);
        if (!normalizedName)
            return;

        this.coverUrls.delete(normalizedName);
        this.deleteCachedResponse(this.coverUrl(normalizedName));
    }

    private async loadCoverBlob(coverName: string): Promise<Blob> {
        const url = this.coverUrl(coverName);
        const cache = await this.openCache();
        const cachedResponse = await this.matchCachedResponse(cache, url);
        if (cachedResponse)
            return cachedResponse.blob();

        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`No se pudo cargar la portada ${coverName}`);

        const responseForCache = response.clone();
        const blob = await response.blob();
        this.putCachedResponse(cache, url, responseForCache);
        return blob;
    }

    private async openCache(): Promise<Cache | null> {
        if (!('caches' in window))
            return null;
        try {
            return await caches.open(this.cacheName);
        } catch {
            return null;
        }
    }

    private async matchCachedResponse(cache: Cache | null, url: string): Promise<Response | undefined> {
        try {
            return cache?.match(url);
        } catch {
            return undefined;
        }
    }

    private putCachedResponse(cache: Cache | null, url: string, response: Response): void {
        cache?.put(url, response).catch(() => undefined);
    }

    private deleteCachedResponse(url: string): void {
        if (!('caches' in window))
            return;
        caches.open(this.cacheName)
            .then(cache => cache.delete(url))
            .catch(() => undefined);
    }

    private coverUrl(coverName: string): string {
        return `${environment.getImgUrl}cover/${encodeURIComponent(coverName)}`;
    }

    private normalizeCoverName(coverName: string | null | undefined): string {
        return (coverName ?? '').trim();
    }
}
