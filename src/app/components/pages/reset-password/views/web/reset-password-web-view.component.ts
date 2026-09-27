import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { WebAuthPageComponent } from '../../../../web/public/web-auth-page/web-auth-page.component';
import { ResetPasswordViewState } from '../reset-password-view.contract';

@Component({
    selector: 'app-reset-password-web-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, WebAuthPageComponent],
    templateUrl: './reset-password-web-view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordWebViewComponent {
    @Input({ required: true }) state!: ResetPasswordViewState;
    @Output() confirmReset = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();
    @Output() repeatBlur = new EventEmitter<void>();

    passwordHidden = true;
    repeatHidden = true;

    get title(): string {
        return ({
            checking: 'Comprobando enlace.',
            form: 'Nueva contraseña.',
            invalid: 'Enlace no válido.',
            managed_return: 'Recuperación completada.'
        })[this.state.flowState];
    }

    get supporting(): string {
        return ({
            checking: 'Estamos verificando que este enlace siga vigente.',
            form: 'Elige una clave nueva para volver a entrar en tu biblioteca.',
            invalid: 'Solicita un nuevo enlace para recuperar el acceso a tu biblioteca.',
            managed_return: 'Ya puedes regresar al acceso de tu biblioteca.'
        })[this.state.flowState];
    }
}
