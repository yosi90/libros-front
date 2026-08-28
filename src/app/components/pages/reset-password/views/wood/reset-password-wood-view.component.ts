import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { ResetPasswordViewState } from '../reset-password-view.contract';

@Component({
    selector: 'app-reset-password-wood-view', standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
    templateUrl: './reset-password-wood-view.component.html', styleUrl: './reset-password-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordWoodViewComponent {
    @Input({ required: true }) state!: ResetPasswordViewState;
    @Output() confirmReset = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();
    @Output() repeatBlur = new EventEmitter<void>();
    passwordHidden = true;
    repeatHidden = true;
}
