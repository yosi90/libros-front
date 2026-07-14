import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, debounceTime, Subscription } from 'rxjs';
import { ChatFloatingPreferences, ChatFloatingPreferencesPatch } from '../../interfaces/chat';
import { FloatingWindowPlacement, FloatingWindowRuntimeState } from '../../interfaces/floating-window';
import { getApiErrorCode } from '../../shared/api-error-message';
import { ChatService } from '../entities/chat.service';
import { ChatStoreService } from './chat-store.service';
import { FloatingWindowManagerService } from './floating-window-manager.service';

@Injectable({ providedIn: 'root' })
export class ChatFloatingCoordinatorService {
    private actorId: number | null = null;
    private preferences: ChatFloatingPreferences | null = null;
    private readonly preferencesSubject = new BehaviorSubject<ChatFloatingPreferences | null>(null);
    readonly preferences$ = this.preferencesSubject.asObservable();
    private lifecycle = new Subscription();
    private syncing = false;
    private lastCompatible = false;

    constructor(private windows: FloatingWindowManagerService, private chat: ChatService, private chats: ChatStoreService, private router: Router) { }

    initialize(actorId: number): void {
        this.clear();
        if (!Number.isInteger(actorId) || actorId < 1) return;
        this.actorId = actorId;
        this.windows.initialize(actorId);
        this.lastCompatible = this.isCompatible();
        this.chat.floatingPreferences().subscribe({
            next: preferences => {
                if (preferences.VersionShape !== 1 || this.actorId !== actorId) return;
                this.preferences = preferences;
                this.preferencesSubject.next(preferences);
                if (this.isCompatible()) this.restore(preferences);
                this.listenForChanges();
            },
            error: () => this.listenForChanges()
        });
    }

    openList(): void {
        if (!this.isCompatible()) {
            void this.router.navigate(['/dashboard/community/messages']);
            return;
        }
        this.windows.open('chat-list', 'Chats', this.listPlacement());
    }

    openConversation(conversationId: number): void {
        if (!Number.isInteger(conversationId) || conversationId < 1) return;
        if (!this.isCompatible()) {
            void this.router.navigate(['/dashboard/community/messages', conversationId]);
            return;
        }
        const openConversations = this.windows.snapshot.filter(item => item.open && item.id.startsWith('chat-conversation:'));
        if (openConversations.length >= 5 && !openConversations.some(item => item.id === this.conversationWindowId(conversationId)))
            this.windows.close(openConversations[0].id);
        const conversation = this.chats.snapshot.conversations.find(item => item.Id === conversationId);
        this.windows.open(this.conversationWindowId(conversationId), conversation?.Titulo?.trim() || (conversation?.Tipo === 'sistema' ? 'Yosiftware' : 'Conversación'), this.conversationPlacement(openConversations.length));
    }

    closeConversation(conversationId: number): void { this.windows.close(this.conversationWindowId(conversationId)); }
    closeAll(): void { this.windows.snapshot.filter(item => item.id === 'chat-list' || item.id.startsWith('chat-conversation:')).forEach(item => this.windows.close(item.id)); }

    conversationId(windowId: string): number | null {
        const match = /^chat-conversation:(\d+)$/.exec(windowId);
        const id = match ? Number(match[1]) : 0;
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    handleViewportChange(): void {
        const compatible = this.isCompatible();
        if (!compatible) this.closeAll();
        else if (!this.lastCompatible && this.preferences) this.restore(this.preferences);
        this.lastCompatible = compatible;
    }

    clear(): void {
        this.lifecycle.unsubscribe();
        this.lifecycle = new Subscription();
        this.actorId = null;
        this.preferences = null;
        this.preferencesSubject.next(null);
        this.syncing = false;
        this.lastCompatible = false;
        this.windows.clear();
    }

    isCompatible(width = window.innerWidth, height = window.innerHeight): boolean { return width >= 1250 && height >= 700 && width > height; }
    get bubblesAllowed(): boolean { return this.preferences?.PermitirBurbujas !== false; }
    get preferenceSnapshot(): ChatFloatingPreferences | null { return this.preferences; }

    adoptPreferences(preferences: ChatFloatingPreferences): void {
        if (preferences.VersionShape !== 1) return;
        this.preferences = preferences;
        this.preferencesSubject.next(preferences);
        if (!preferences.PermitirBurbujas)
            this.windows.snapshot.filter(item => item.mode === 'minimized' && item.id.startsWith('chat-conversation:')).forEach(item => this.windows.update(item.id, 'window', item.restoredPlacement));
    }

    private listenForChanges(): void {
        this.lifecycle.unsubscribe();
        this.lifecycle = this.windows.windows$.pipe(debounceTime(650)).subscribe(windows => this.sync(windows));
    }

    private restore(preferences: ChatFloatingPreferences): void {
        if (preferences.AutoabrirListado)
            this.windows.open('chat-list', 'Chats', this.fromRemote(preferences.PosicionListado, preferences.TamanoListado, this.listPlacement()));
        preferences.ConversacionesFlotantes.slice(0, 5).forEach((item, index) => {
            const state = this.windows.open(this.conversationWindowId(item.ConversacionId), 'Conversación', this.fromRemote(item.Posicion, item.Tamano, this.conversationPlacement(index)));
            if (state && item.Modo === 'minimizado' && preferences.PermitirBurbujas) this.windows.update(state.id, 'minimized', state.restoredPlacement);
            else if (state && state.mode === 'minimized' && !preferences.PermitirBurbujas) this.windows.update(state.id, 'window', state.restoredPlacement);
        });
        const list = this.windows.snapshot.find(item => item.id === 'chat-list');
        if (list && preferences.ModoListado === 'minimizado') this.windows.update(list.id, 'minimized', list.restoredPlacement);
    }

    private sync(windows: FloatingWindowRuntimeState[], retry = true): void {
        if (!this.actorId || !this.preferences || this.syncing || !this.isCompatible()) return;
        const list = windows.find(item => item.id === 'chat-list' && item.open);
        const conversations = windows.filter(item => item.open && item.id.startsWith('chat-conversation:')).slice(-5);
        const patch: ChatFloatingPreferencesPatch = {
            Version: this.preferences.Version,
            AutoabrirListado: !!list,
            ModoListado: list?.mode === 'minimized' ? 'minimizado' : 'normal',
            PosicionListado: list ? { x: list.restoredPlacement.left, y: list.restoredPlacement.top } : null,
            TamanoListado: list ? { ancho: list.restoredPlacement.width, alto: list.restoredPlacement.height } : null,
            ConversacionesFlotantes: conversations.flatMap(item => {
                const id = this.conversationId(item.id);
                return id ? [{ ConversacionId: id, Modo: item.mode === 'minimized' ? 'minimizado' as const : 'normal' as const, Posicion: { x: item.restoredPlacement.left, y: item.restoredPlacement.top }, Tamano: { ancho: item.restoredPlacement.width, alto: item.restoredPlacement.height } }] : [];
            })
        };
        this.syncing = true;
        this.chat.saveFloatingPreferences(patch).subscribe({
            next: preferences => { if (preferences.VersionShape === 1) this.adoptPreferences(preferences); this.syncing = false; },
            error: error => {
                this.syncing = false;
                if (retry && getApiErrorCode(error) === 'chat_preferences_conflict')
                    this.chat.floatingPreferences().subscribe({ next: preferences => { this.preferences = preferences; this.sync(windows, false); } });
            }
        });
    }

    private listPlacement(): FloatingWindowPlacement { return { left: Math.max(12, window.innerWidth - 382), top: 70, width: 350, height: Math.min(620, window.innerHeight - 100) }; }
    private conversationPlacement(offset: number): FloatingWindowPlacement { return { left: Math.max(12, window.innerWidth - 980 + offset * 24), top: 45 + offset * 22, width: 650, height: Math.min(650, window.innerHeight - 80) }; }
    private conversationWindowId(id: number): string { return `chat-conversation:${id}`; }
    private fromRemote(position: { x?: number; y?: number } | null | undefined, size: { ancho?: number; alto?: number } | null | undefined, fallback: FloatingWindowPlacement): FloatingWindowPlacement {
        return { left: position?.x ?? fallback.left, top: position?.y ?? fallback.top, width: size?.ancho ?? fallback.width, height: size?.alto ?? fallback.height };
    }
}
