import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { ForgotPasswordViewState } from '../forgot-password-view.contract';

@Component({
    selector: 'app-forgot-password-wood-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
    templateUrl: './forgot-password-wood-view.component.html',
    styleUrl: './forgot-password-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordWoodViewComponent {
    @Input({ required: true }) state!: ForgotPasswordViewState;
    @Output() requestReset = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
}
