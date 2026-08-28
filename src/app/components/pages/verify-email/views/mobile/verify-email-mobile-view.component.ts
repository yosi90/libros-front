import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { VerifyEmailViewState } from '../verify-email-view.contract';

@Component({
    selector: 'app-verify-email-mobile-view', standalone: true,
    imports: [MatIconModule, MobileAuthPageComponent],
    templateUrl: './verify-email-mobile-view.component.html', styleUrl: './verify-email-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailMobileViewComponent {
    @Input({ required: true }) state!: VerifyEmailViewState;
    @Output() goToLogin = new EventEmitter<void>();
    get title(): string { return this.state.verified ? 'Correo verificado.' : this.state.failed ? 'Enlace no válido.' : 'Verificando correo.'; }
    get supporting(): string { return this.state.verified ? 'Tu cuenta ya está activa y tu biblioteca te espera.' : this.state.failed ? 'El enlace puede haber caducado o haberse utilizado anteriormente.' : 'Estamos confirmando tu cuenta de forma segura.'; }
}
