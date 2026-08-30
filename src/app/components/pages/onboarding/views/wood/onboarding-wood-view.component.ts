import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { OnboardingViewState } from '../onboarding-view.contract';
import { CountryAutocompleteComponent } from '../../../../shared/common/country-autocomplete/country-autocomplete.component';

@Component({
    selector: 'app-onboarding-wood-view', standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, CountryAutocompleteComponent],
    templateUrl: './onboarding-wood-view.component.html', styleUrl: './onboarding-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingWoodViewComponent {
    @Input({ required: true }) state!: OnboardingViewState;
    @Output() submitOnboarding = new EventEmitter<void>();
}
