import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { LoginViewState } from '../login-view.contract';

@Component({
    selector: 'app-login-mobile-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, MobileAuthPageComponent],
    templateUrl: './login-mobile-view.component.html',
    styleUrl: './login-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginMobileViewComponent {
    @Input({ required: true }) state!: LoginViewState;
    @Output() login = new EventEmitter<void>();
    @Output() googleLogin = new EventEmitter<void>();
    @Output() requestPhone = new EventEmitter<void>();
    @Output() confirmPhone = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();

    passwordHidden = true;
}
