import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ComentarioDeNovedad, ComentariosPagina, Novedad, NovedadesPagina } from '../../interfaces/platform-news';
import { PlatformApiService } from './platform-api.service';

/**
 * Las novedades de Libros en la plataforma (ecosistema-kit/NOVEDADES.md, «Enseñar el feed en tu web»): el feed de las
 * amistades y de quienes sigue la persona, «Descubrir», los «me gusta» y los comentarios. Las publica el backend; el
 * navegador solo las lee y reacciona, con el token de la plataforma.
 */
@Injectable({ providedIn: 'root' })
export class PlatformNewsService {
    constructor(private api: PlatformApiService) { }

    feed(cursor?: string | null): Observable<NovedadesPagina> {
        return this.api.get<NovedadesPagina>('/v1/novedades', { cursor, limite: 20 })
            .pipe(map(page => ({ novedades: page?.novedades ?? [], cursor: page?.cursor ?? null })));
    }

    discover(): Observable<Novedad[]> {
        return this.api.get<{ novedades: Novedad[] }>('/v1/novedades/descubrir').pipe(map(page => page?.novedades ?? []));
    }

    like(id: number): Observable<void> { return this.api.put<void>(`/v1/novedades/${id}/me-gusta`); }

    unlike(id: number): Observable<void> { return this.api.delete<void>(`/v1/novedades/${id}/me-gusta`); }

    comments(id: number, cursor?: string | null): Observable<ComentariosPagina> {
        return this.api.get<ComentariosPagina>(`/v1/novedades/${id}/comentarios`, { cursor })
            .pipe(map(page => ({ comentarios: page?.comentarios ?? [], cursor: page?.cursor ?? null })));
    }

    comment(id: number, texto: string): Observable<ComentarioDeNovedad> {
        return this.api.post<ComentarioDeNovedad>(`/v1/novedades/${id}/comentarios`, { texto });
    }

    deleteComment(id: number, commentId: number): Observable<void> {
        return this.api.delete<void>(`/v1/novedades/${id}/comentarios/${commentId}`);
    }
}
