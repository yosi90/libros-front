import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { WebAuthPageComponent } from '../../../../web/public/web-auth-page/web-auth-page.component';
import { OnboardingViewState } from '../onboarding-view.contract';

@Component({
    selector: 'app-onboarding-web-view',
    standalone: true,
    imports: [ReactiveFormsModule, MatIconModule, WebAuthPageComponent],
    templateUrl: './onboarding-web-view.component.html',
    styleUrl: './onboarding-web-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingWebViewComponent {
    @Input({ required: true }) state!: OnboardingViewState;
    @Output() submitOnboarding = new EventEmitter<void>();
    @Output() retryPolicy = new EventEmitter<void>();
    @Output() changeEmail = new EventEmitter<void>();
}
