import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { ChatComponent } from '../../../shared/user-pages/chat/chat.component';

@Component({
    selector: 'app-mobile-chat-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './mobile-chat-view.component.html',
    styleUrl: './mobile-chat-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileChatViewComponent {
    @Input({ required: true }) controller!: ChatComponent;
    get c(): ChatComponent { return this.controller; }
}
