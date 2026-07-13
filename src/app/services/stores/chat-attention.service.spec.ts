import { ChatAttentionService } from './chat-attention.service';

describe('ChatAttentionService', () => {
    it('mantiene el foco si otra representación de la misma conversación sigue activa', () => {
        const service = new ChatAttentionService();
        const page = {};
        const floating = {};
        service.set(page, 8, true);
        service.set(floating, 8, true);

        service.clear(page);

        expect(service.isFocused(8)).toBeTrue();
        service.clear(floating);
        expect(service.isFocused(8)).toBeFalse();
    });
});
