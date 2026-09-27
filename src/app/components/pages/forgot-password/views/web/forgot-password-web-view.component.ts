import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { WebAuthPageComponent } from '../../../../web/public/web-auth-page/web-auth-page.component';
import { ForgotPasswordViewState } from '../forgot-password-view.contract';

@Component({
    selector: 'app-forgot-password-web-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, WebAuthPageComponent],
    templateUrl: './forgot-password-web-view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordWebViewComponent {
    @Input({ required: true }) state!: ForgotPasswordViewState;
    @Output() requestReset = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
}
