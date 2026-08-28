import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { VerifyEmailViewState } from '../verify-email-view.contract';

@Component({
    selector: 'app-verify-email-wood-view', standalone: true,
    imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
    templateUrl: './verify-email-wood-view.component.html', styleUrl: './verify-email-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyEmailWoodViewComponent {
    @Input({ required: true }) state!: VerifyEmailViewState;
    @Output() goToLogin = new EventEmitter<void>();
}
