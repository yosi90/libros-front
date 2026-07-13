import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatConversation } from '../../../../interfaces/chat';
import { ChatService } from '../../../../services/entities/chat.service';
import { RealtimeSocketService } from '../../../../services/realtime/realtime-socket.service';

@Component({
    standalone: true,
    selector: 'app-chat',
    imports: [DatePipe, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.sass'
})
export class ChatComponent implements OnInit, OnDestroy {
    conversations: ChatConversation[] = [];
    isLoading = true;
    error = '';
    accessRevokedMessage = '';
    private realtimeSubscription: Subscription | null = null;

    constructor(private chat: ChatService, private realtime: RealtimeSocketService, private router: Router) { }

    ngOnInit(): void {
        this.accessRevokedMessage = (this.router.getCurrentNavigation()?.extras.state?.['accessRevokedMessage'] as string | undefined) ?? '';
        this.load();
        this.realtime.open('chat');
        this.realtimeSubscription = this.realtime.events$.subscribe(event => {
            if (event.type === 'realtime.access_revoked' || (event.channel === 'chat' && event.type.startsWith('chat.'))) this.load();
        });
        this.realtimeSubscription.add(this.realtime.connections$.subscribe(event => {
            if (event.channel === 'chat' && event.reconnected) this.load();
        }));
    }

    ngOnDestroy(): void { this.realtimeSubscription?.unsubscribe(); }

    load(): void {
        this.isLoading = true;
        this.error = '';
        this.chat.conversations().subscribe({
            next: conversations => { this.conversations = conversations; this.isLoading = false; },
            error: () => { this.error = 'No se han podido cargar las conversaciones.'; this.isLoading = false; }
        });
    }
}
