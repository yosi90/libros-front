import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { ChatComponent } from '../../../shared/user-pages/chat/chat.component';

/** Mensajes en Web: bandeja a la izquierda y conversación (ruta hija) a la derecha. */
@Component({
    selector: 'app-web-chat-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './web-chat-view.component.html',
    styleUrl: './web-chat-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebChatViewComponent {
    @Input({ required: true }) controller!: ChatComponent;
    get c(): ChatComponent { return this.controller; }

    initial(name: string | null | undefined): string {
        return (name ?? '').trim().charAt(0).toUpperCase() || '?';
    }
}
