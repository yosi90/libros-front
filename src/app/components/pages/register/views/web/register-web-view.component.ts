import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { WebAuthPageComponent } from '../../../../web/public/web-auth-page/web-auth-page.component';
import { RegisterViewState } from '../register-view.contract';

@Component({
    selector: 'app-register-web-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, WebAuthPageComponent],
    templateUrl: './register-web-view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterWebViewComponent {
    @Input({ required: true }) state!: RegisterViewState;
    @Output() register = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();

    passwordHidden = true;
}
