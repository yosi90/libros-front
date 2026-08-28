import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { ResetPasswordViewState } from '../reset-password-view.contract';

@Component({
    selector: 'app-reset-password-mobile-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, MobileAuthPageComponent],
    templateUrl: './reset-password-mobile-view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordMobileViewComponent {
    @Input({ required: true }) state!: ResetPasswordViewState;
    @Output() confirmReset = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();
    @Output() repeatBlur = new EventEmitter<void>();
    passwordHidden = true;
    repeatHidden = true;
    get title(): string { return this.state.actionCode ? 'Nueva contraseña.' : 'Recuperación completada.'; }
    get supporting(): string { return this.state.actionCode ? 'Elige una clave nueva para volver a entrar en tu biblioteca.' : 'Ya puedes regresar al acceso de tu biblioteca.'; }
}
