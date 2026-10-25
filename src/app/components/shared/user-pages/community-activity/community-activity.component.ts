import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ComentarioDeNovedad, Novedad } from '../../../../interfaces/platform-news';
import { PlataformaPersona } from '../../../../interfaces/platform-person';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { PlatformNewsService } from '../../../../services/platform/platform-news.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { platformAssetUrl } from '../../../../shared/platform';
import { MobileCommunityActivityViewComponent } from '../../../mobile/social/mobile-community-activity-view/mobile-community-activity-view.component';
import { WebCommunityActivityViewComponent } from '../../../web/social/web-community-activity-view/web-community-activity-view.component';

/** Lo abierto de los comentarios de una novedad. */
export interface ActivityComments {
    items: ComentarioDeNovedad[];
    cursor: string | null;
    loading: boolean;
    sending: boolean;
    draft: string;
    error: string;
}

/**
 * La Actividad de Comunidad: lo que comparten desde Libros las amistades y quienes sigue la persona, con «me gusta» y
 * comentarios (el feed de la plataforma, ecosistema-kit/NOVEDADES.md). Si el feed está vacío, «Descubrir» enseña lo
 * público reciente. La plataforma decide quién ve qué; lo que se comparte se ajusta en la web social.
 */
@Component({
    standalone: true,
    selector: 'app-community-activity',
    imports: [MobileCommunityActivityViewComponent, WebCommunityActivityViewComponent],
    template: `@if (isMobilePresentation) {<app-mobile-community-activity-view [controller]="this"></app-mobile-community-activity-view>} @else {<app-web-community-activity-view [controller]="this"></app-web-community-activity-view>}`,
    changeDetection: ChangeDetectionStrategy.Eager
})
export class CommunityActivityComponent implements OnInit {
    items: Novedad[] = [];
    cursor: string | null = null;
    loading = false;
    loadingMore = false;
    error = '';
    /** «Descubrir»: solo si el feed está vacío. */
    discover: Novedad[] = [];
    readonly likeBusy = new Set<number>();
    readonly comments = new Map<number, ActivityComments>();
    readonly settingsUrl: string;

    constructor(private news: PlatformNewsService, private session: PlatformSessionService, private presentation: PresentationModeService) {
        this.settingsUrl = this.session.socialUrl('novedades');
    }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }

    ngOnInit(): void { this.load(); }

    load(): void {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        this.news.feed().subscribe({
            next: page => {
                this.items = page.novedades;
                this.cursor = page.cursor;
                this.loading = false;
                this.discover = [];
                if (!page.novedades.length) this.loadDiscover();
            },
            error: error => {
                this.loading = false;
                this.error = getApiErrorMessage(error, 'No se ha podido cargar la actividad.');
            }
        });
    }

    loadMore(): void {
        if (!this.cursor || this.loadingMore) return;
        this.loadingMore = true;
        this.news.feed(this.cursor).subscribe({
            next: page => {
                const ids = new Set(this.items.map(item => item.id));
                this.items = [...this.items, ...page.novedades.filter(item => !ids.has(item.id))];
                this.cursor = page.cursor;
                this.loadingMore = false;
            },
            error: error => {
                this.loadingMore = false;
                this.error = getApiErrorMessage(error, 'No se ha podido cargar más actividad.');
            }
        });
    }

    private loadDiscover(): void {
        this.news.discover().subscribe({ next: items => this.discover = items, error: () => this.discover = [] });
    }

    /** «Me gusta», al momento; si la plataforma no lo acepta, vuelve atrás. */
    toggleLike(item: Novedad): void {
        if (this.likeBusy.has(item.id)) return;
        const before = item.meGusta;
        const liked = !before.propio;
        item.meGusta = { propio: liked, total: Math.max(0, before.total + (liked ? 1 : -1)) };
        this.likeBusy.add(item.id);
        (liked ? this.news.like(item.id) : this.news.unlike(item.id)).subscribe({
            next: () => this.likeBusy.delete(item.id),
            error: error => {
                item.meGusta = before;
                this.likeBusy.delete(item.id);
                this.error = getApiErrorMessage(error, 'No se ha podido guardar el «me gusta».');
            }
        });
    }

    commentsOf(item: Novedad): ActivityComments | undefined { return this.comments.get(item.id); }

    toggleComments(item: Novedad): void {
        if (this.comments.has(item.id)) {
            this.comments.delete(item.id);
            return;
        }
        this.comments.set(item.id, { items: [], cursor: null, loading: false, sending: false, draft: '', error: '' });
        this.loadComments(item);
    }

    loadComments(item: Novedad, more = false): void {
        const state = this.comments.get(item.id);
        if (!state || state.loading || (more && !state.cursor)) return;
        state.loading = true;
        this.news.comments(item.id, more ? state.cursor : null).subscribe({
            next: page => {
                state.items = more ? [...state.items, ...page.comentarios] : page.comentarios;
                state.cursor = page.cursor;
                state.loading = false;
            },
            error: error => {
                state.loading = false;
                state.error = getApiErrorMessage(error, 'No se han podido cargar los comentarios.');
            }
        });
    }

    sendComment(item: Novedad): void {
        const state = this.comments.get(item.id);
        const text = state?.draft.trim() ?? '';
        if (!state || !text || state.sending) return;
        state.sending = true;
        state.error = '';
        this.news.comment(item.id, text.slice(0, 500)).subscribe({
            next: comment => {
                state.items = [...state.items, comment];
                state.draft = '';
                state.sending = false;
                item.comentarios += 1;
            },
            error: error => {
                state.sending = false;
                state.error = getApiErrorMessage(error, 'No se ha podido enviar el comentario.');
            }
        });
    }

    /** El comentario propio, o cualquiera en una novedad propia. */
    canDeleteComment(item: Novedad, comment: ComentarioDeNovedad): boolean { return comment.propio || item.relacion === 'propia'; }

    deleteComment(item: Novedad, comment: ComentarioDeNovedad): void {
        const state = this.comments.get(item.id);
        if (!state) return;
        this.news.deleteComment(item.id, comment.id).subscribe({
            next: () => {
                state.items = state.items.filter(other => other.id !== comment.id);
                item.comentarios = Math.max(0, item.comentarios - 1);
            },
            error: error => state.error = getApiErrorMessage(error, 'No se ha podido borrar el comentario.')
        });
    }

    personName(person: PlataformaPersona): string { return person.nombre || `@${person.alias}`; }
    personAvatar(person: PlataformaPersona): string | null { return platformAssetUrl(person.avatar?.miniatura); }
    initial(person: PlataformaPersona): string { return this.personName(person).replace('@', '').charAt(0).toUpperCase() || '?'; }
    headerImage(item: Novedad): string | null { return platformAssetUrl(item.cabecera?.imagen); }
    trackItem(_index: number, item: Novedad): number { return item.id; }
}
