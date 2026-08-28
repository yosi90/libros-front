import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { LoginViewState } from '../login-view.contract';

@Component({
    selector: 'app-login-wood-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
    templateUrl: './login-wood-view.component.html',
    styleUrl: './login-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginWoodViewComponent {
    @Input({ required: true }) state!: LoginViewState;
    @Output() login = new EventEmitter<void>();
    @Output() googleLogin = new EventEmitter<void>();
    @Output() requestPhone = new EventEmitter<void>();
    @Output() confirmPhone = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();
    passwordHidden = true;
}
