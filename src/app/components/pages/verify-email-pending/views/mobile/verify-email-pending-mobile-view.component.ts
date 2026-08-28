import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { VerifyEmailPendingViewState } from '../verify-email-pending-view.contract';

@Component({
    selector: 'app-verify-email-pending-mobile-view', standalone: true,
    imports: [MatIconModule, MobileAuthPageComponent],
    templateUrl: './verify-email-pending-mobile-view.component.html', styleUrl: './verify-email-pending-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailPendingMobileViewComponent {
    @Input({ required: true }) state!: VerifyEmailPendingViewState;
    @Output() resend = new EventEmitter<void>();
    @Output() logout = new EventEmitter<void>();
}
