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

    it('redirige los deep links antiguos de chat', () => {
        const children = routes[0].children ?? [];
        expect(children.find(route => route.path === 'chat')?.redirectTo).toBe('community/messages');
        expect(children.find(route => route.path === 'chat/:id')?.redirectTo).toBe('community/messages/:id');
    });
});
