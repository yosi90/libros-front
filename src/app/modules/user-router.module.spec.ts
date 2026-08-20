import { routes } from './user-router.module';

describe('rutas del hub social', () => {
    it('mantiene el shell en las superficies sociales', () => {
        const social = routes[0].children?.find(route => route.path === 'community');
        const children = social?.children?.map(route => route.path);

        expect(children).toContain('summary');
        expect(children).toContain('activity');
        expect(children).toContain('friendships');
        expect(children).toContain('blocks');
        expect(children).toContain('clubs/:id');
        expect(children).toContain('users/:id');
        const messages = social?.children?.find(route => route.path === 'messages');
        expect(messages?.children?.map(route => route.path)).toContain(':id');
    });

    it('solo expone las rutas canónicas del dashboard', () => {
        const children = routes[0].children ?? [];
        const paths = children.map(route => route.path);

        expect(paths).toContain('authors/new');
        expect(paths).toContain('universes/new');
        expect(paths).toContain('sagas/new');
        expect(paths).toContain('anthologies/new');
        expect(paths).toContain('books/manage/new');
        expect(paths).not.toContain('chat');
        expect(paths).not.toContain('chat/:id');
        expect(paths.some(path => path?.startsWith('add') || path?.startsWith('update'))).toBeFalse();
    });
});
