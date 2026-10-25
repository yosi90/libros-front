import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Novedad } from '../../../../interfaces/platform-news';
import { CommunityActivityComponent } from './community-activity.component';

function novedad(id: number, overrides: Partial<Novedad> = {}): Novedad {
    return {
        id, web: { clave: 'libros', nombre: 'Libros' }, tipo: { clave: 'libro.empezado', nombre: 'Empezar un libro' },
        persona: { id: 'c1', alias: 'ana', nombre: 'Ana', avatar: { url: '/v1/perfiles/c1/avatar', miniatura: '/v1/perfiles/c1/avatar/miniatura?v=2' } },
        texto: 'ha empezado a leer «Dune»', enlace: null, imagen: null, creada: '2026-10-25T10:00:00Z',
        meGusta: { total: 1, propio: false }, comentarios: 0, relacion: 'amistad', cabecera: null,
        ...overrides
    };
}

describe('CommunityActivityComponent', () => {
    function create() {
        const news = jasmine.createSpyObj('PlatformNewsService', ['feed', 'discover', 'like', 'unlike', 'comments', 'comment', 'deleteComment']);
        const session = jasmine.createSpyObj('PlatformSessionService', ['socialUrl']);
        session.socialUrl.and.returnValue('https://social.prueba/?vista=novedades');
        const component = new CommunityActivityComponent(news, session, { snapshot: { isMobilePresentationActive: false } } as never);
        return { component, news };
    }

    it('carga el feed y pagina sin repetir', () => {
        const { component, news } = create();
        news.feed.and.returnValues(of({ novedades: [novedad(1), novedad(2)], cursor: 'c2' }), of({ novedades: [novedad(2), novedad(3)], cursor: null }));
        component.ngOnInit();
        component.loadMore();
        expect(component.items.map(item => item.id)).toEqual([1, 2, 3]);
        expect(component.cursor).toBeNull();
        expect(news.discover).not.toHaveBeenCalled();
        expect(component.settingsUrl).toContain('vista=novedades');
    });

    it('con el feed vacío, enseña «Descubrir»', () => {
        const { component, news } = create();
        news.feed.and.returnValue(of({ novedades: [], cursor: null }));
        news.discover.and.returnValue(of([novedad(9)]));
        component.ngOnInit();
        expect(component.discover.map(item => item.id)).toEqual([9]);
    });

    it('el «me gusta» se ve al momento y vuelve atrás si falla', () => {
        const { component, news } = create();
        const item = novedad(1);
        news.like.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429, error: { code: 'demasiadas_peticiones', error: 'Demasiadas peticiones seguidas.' } })));
        component.toggleLike(item);
        expect(item.meGusta).toEqual({ total: 1, propio: false });
        expect(component.error).toBe('Demasiadas peticiones seguidas.');
        news.like.and.returnValue(of(undefined));
        component.toggleLike(item);
        expect(item.meGusta).toEqual({ total: 2, propio: true });
    });

    it('comenta, cuenta el comentario y deja borrar el propio o cualquiera en una novedad propia', () => {
        const { component, news } = create();
        const item = novedad(1);
        news.comments.and.returnValue(of({ comentarios: [], cursor: null }));
        news.comment.and.returnValue(of({ id: 5, persona: item.persona, texto: 'Me encantó', creado: '2026-10-25T11:00:00Z', propio: true }));
        component.toggleComments(item);
        component.commentsOf(item)!.draft = ' Me encantó ';
        component.sendComment(item);
        expect(news.comment).toHaveBeenCalledWith(1, 'Me encantó');
        expect(item.comentarios).toBe(1);
        expect(component.commentsOf(item)!.items.length).toBe(1);
        const ajeno = { ...component.commentsOf(item)!.items[0], propio: false };
        expect(component.canDeleteComment(item, ajeno)).toBeFalse();
        expect(component.canDeleteComment(novedad(2, { relacion: 'propia' }), ajeno)).toBeTrue();
        news.deleteComment.and.returnValue(of(undefined));
        component.deleteComment(item, component.commentsOf(item)!.items[0]);
        expect(item.comentarios).toBe(0);
        component.toggleComments(item);
        expect(component.commentsOf(item)).toBeUndefined();
    });
});
