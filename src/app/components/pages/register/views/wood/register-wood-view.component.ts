import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { RegisterViewState } from '../register-view.contract';

@Component({
    selector: 'app-register-wood-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
    templateUrl: './register-wood-view.component.html',
    styleUrl: './register-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterWoodViewComponent {
    @Input({ required: true }) state!: RegisterViewState;
    @Output() register = new EventEmitter<void>();
    @Output() usernameBlur = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();
    passwordHidden = true;
}
