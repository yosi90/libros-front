import { DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ChatConversationComponent } from '../../../shared/user-pages/chat-conversation/chat-conversation.component';

@Component({
    selector: 'app-mobile-chat-conversation-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink],
    templateUrl: './mobile-chat-conversation-view.component.html',
    styleUrl: './mobile-chat-conversation-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileChatConversationViewComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) controller!: ChatConversationComponent;
    @ViewChild('messageList') messageList?: ElementRef<HTMLElement>;

    get c(): ChatConversationComponent { return this.controller; }

    ngAfterViewInit(): void {
        this.controller.messageList = this.messageList;
    }

    ngOnDestroy(): void {
        if (this.controller.messageList === this.messageList) this.controller.messageList = undefined;
    }
}
