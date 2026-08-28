import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { OnboardingViewState } from '../onboarding-view.contract';

@Component({
    selector: 'app-onboarding-mobile-view', standalone: true,
    imports: [ReactiveFormsModule, MatIconModule, MobileAuthPageComponent],
    templateUrl: './onboarding-mobile-view.component.html', styleUrl: './onboarding-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingMobileViewComponent {
    @Input({ required: true }) state!: OnboardingViewState;
    @Output() submitOnboarding = new EventEmitter<void>();
}
