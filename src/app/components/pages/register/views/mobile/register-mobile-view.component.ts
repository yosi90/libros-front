import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { RegisterViewState } from '../register-view.contract';

@Component({
    selector: 'app-register-mobile-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, MobileAuthPageComponent],
    templateUrl: './register-mobile-view.component.html',
    styleUrl: './register-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterMobileViewComponent {
    @Input({ required: true }) state!: RegisterViewState;
    @Output() register = new EventEmitter<void>();
    @Output() usernameBlur = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();
    passwordHidden = true;
}
