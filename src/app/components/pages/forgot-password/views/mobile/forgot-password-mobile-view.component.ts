import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { ForgotPasswordViewState } from '../forgot-password-view.contract';

@Component({
    selector: 'app-forgot-password-mobile-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, MobileAuthPageComponent],
    templateUrl: './forgot-password-mobile-view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordMobileViewComponent {
    @Input({ required: true }) state!: ForgotPasswordViewState;
    @Output() requestReset = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
}
