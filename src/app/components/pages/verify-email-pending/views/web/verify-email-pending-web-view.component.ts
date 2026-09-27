import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { WebAuthPageComponent } from '../../../../web/public/web-auth-page/web-auth-page.component';
import { VerifyEmailPendingViewState } from '../verify-email-pending-view.contract';

@Component({
    selector: 'app-verify-email-pending-web-view',
    standalone: true,
    imports: [MatIconModule, WebAuthPageComponent],
    templateUrl: './verify-email-pending-web-view.component.html',
    styleUrl: './verify-email-pending-web-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailPendingWebViewComponent {
    @Input({ required: true }) state!: VerifyEmailPendingViewState;
    @Output() resend = new EventEmitter<void>();
    @Output() logout = new EventEmitter<void>();
}
