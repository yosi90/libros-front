import { Injectable } from '@angular/core';
import { onDisconnect, onValue, ref, remove, serverTimestamp, set } from 'firebase/database';
import { Observable } from 'rxjs';
import { FirebaseSessionService } from './firebase-session.service';

@Injectable({ providedIn: 'root' })
export class FirebasePresenceService {
    private currentUserId: number | null = null;
    private readonly typingConversationIds = new Set<number>();
    private connectionUnsubscribe: (() => void) | null = null;

    constructor(private firebaseSession: FirebaseSessionService) { }

    async start(userId: number): Promise<void> {
        const database = this.firebaseSession.database;
        if (!database)
            return;

        this.connectionUnsubscribe?.();
        this.currentUserId = userId;
        await this.publishOwnPresence(userId);
        this.connectionUnsubscribe = onValue(ref(database, '.info/connected'), snapshot => {
            if (snapshot.val() === true && this.currentUserId === userId)
                void this.publishOwnPresence(userId).catch(() => void 0);
        });
    }

    async setTyping(conversationId: number, isTyping: boolean): Promise<void> {
        const database = this.firebaseSession.database;
        if (!database || !this.currentUserId)
            return;

        const typingRef = ref(database, `typing/${conversationId}/libros:${this.currentUserId}`);
        if (!isTyping) {
            this.typingConversationIds.delete(conversationId);
            await remove(typingRef);
            return;
        }

        await onDisconnect(typingRef).remove();
        await set(typingRef, true);
        this.typingConversationIds.add(conversationId);
    }

    listenToTyping(conversationId: number, userId: number): Observable<boolean> {
        return new Observable(subscriber => {
            const database = this.firebaseSession.database;
            if (!database) {
                subscriber.complete();
                return;
            }

            const typingRef = ref(database, `typing/${conversationId}/libros:${userId}`);
            const unsubscribe = onValue(typingRef, snapshot => subscriber.next(snapshot.val() === true), error => subscriber.error(error));
            return () => unsubscribe();
        });
    }

    async clear(): Promise<void> {
        this.connectionUnsubscribe?.();
        this.connectionUnsubscribe = null;
        const database = this.firebaseSession.database;
        const userId = this.currentUserId;
        if (!database || !userId)
            return;

        await Promise.all([
            remove(ref(database, `presence/libros:${userId}`)),
            ...Array.from(this.typingConversationIds).map(conversationId => remove(ref(database, `typing/${conversationId}/libros:${userId}`)))
        ]);
        this.typingConversationIds.clear();
        this.currentUserId = null;
    }

    private async publishOwnPresence(userId: number): Promise<void> {
        const database = this.firebaseSession.database;
        if (!database || this.currentUserId !== userId)
            return;

        const presenceRef = ref(database, `presence/libros:${userId}`);
        await onDisconnect(presenceRef).remove();
        await set(presenceRef, { online: true, updatedAt: serverTimestamp() });
    }
}
