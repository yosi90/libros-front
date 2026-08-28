import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { VerifyEmailPendingViewState } from '../verify-email-pending-view.contract';

@Component({
    selector: 'app-verify-email-pending-wood-view', standalone: true,
    imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
    templateUrl: './verify-email-pending-wood-view.component.html', styleUrl: './verify-email-pending-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailPendingWoodViewComponent {
    @Input({ required: true }) state!: VerifyEmailPendingViewState;
    @Output() resend = new EventEmitter<void>();
    @Output() logout = new EventEmitter<void>();
}
