import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { WebAuthPageComponent } from '../../../../web/public/web-auth-page/web-auth-page.component';
import { LoginViewState } from '../login-view.contract';

@Component({
    selector: 'app-login-web-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, WebAuthPageComponent],
    templateUrl: './login-web-view.component.html',
    styleUrl: './login-web-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginWebViewComponent {
    @Input({ required: true }) state!: LoginViewState;
    @Output() login = new EventEmitter<void>();
    @Output() googleLogin = new EventEmitter<void>();
    @Output() requestPhone = new EventEmitter<void>();
    @Output() confirmPhone = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();

    passwordHidden = true;
    method: 'email' | 'phone' = 'email';

    /** Vincular Google exige la contraseña: solo se ofrece el correo. */
    get activeMethod(): 'email' | 'phone' {
        return this.state.linkRequired || !this.state.phoneEnabled ? 'email' : this.method;
    }
}
