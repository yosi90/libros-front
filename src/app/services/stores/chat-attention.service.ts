import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatAttentionService {
    private readonly focusedByOwner = new Map<object, number>();

    set(owner: object, conversationId: number, focused: boolean): void {
        if (focused && Number.isInteger(conversationId) && conversationId > 0) this.focusedByOwner.set(owner, conversationId);
        else this.focusedByOwner.delete(owner);
    }

    clear(owner: object): void { this.focusedByOwner.delete(owner); }
    isFocused(conversationId: number): boolean { return [...this.focusedByOwner.values()].includes(conversationId); }
}
