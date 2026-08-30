import { ChangeDetectionStrategy, Component, EventEmitter, forwardRef, Input, Output, ViewChild } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormControl, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { COUNTRIES, CountryOption, filterCountries, findCountry } from '../../../../shared/countries';

@Component({
    selector: 'app-country-autocomplete', standalone: true,
    imports: [ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule],
    templateUrl: './country-autocomplete.component.html', styleUrl: './country-autocomplete.component.sass',
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CountryAutocompleteComponent), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => CountryAutocompleteComponent), multi: true }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CountryAutocompleteComponent implements ControlValueAccessor, Validator {
    @Input() presentation: 'mobile' | 'wood' = 'mobile';
    @Input() label = 'País';
    @Output() countrySelected = new EventEmitter<CountryOption | null>();
    @ViewChild(MatAutocompleteTrigger) trigger?: MatAutocompleteTrigger;

    readonly input = new FormControl('', { nonNullable: true });
    disabled = false;
    selectedCode: string | null = null;
    private onChange: (value: string | null) => void = () => undefined;
    private onTouched: () => void = () => undefined;
    private onValidatorChange: () => void = () => undefined;

    constructor() {
        this.input.valueChanges.subscribe(value => {
            if (value !== this.selectedCode) this.selectedCode = null;
            this.onChange(value || null);
            this.onValidatorChange();
        });
    }

    get options(): CountryOption[] {
        return this.selectedCode === this.input.value ? COUNTRIES : filterCountries(this.input.value);
    }

    displayCountry = (value: string | null): string => {
        const country = findCountry(value);
        return country ? `${country.flag} ${country.name}` : value ?? '';
    };

    select(event: MatAutocompleteSelectedEvent): void {
        const country = findCountry(event.option.value);
        if (!country) return;
        this.selectedCode = country.code;
        this.input.setValue(country.code, { emitEvent: false });
        this.onChange(country.code);
        this.onValidatorChange();
        this.countrySelected.emit(country);
    }

    clear(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.selectedCode = null;
        this.input.setValue('', { emitEvent: false });
        this.onChange(null);
        this.onValidatorChange();
        this.countrySelected.emit(null);
        queueMicrotask(() => this.trigger?.openPanel());
    }

    focus(): void {
        queueMicrotask(() => this.trigger?.openPanel());
    }

    blur(): void {
        this.onTouched();
        this.onValidatorChange();
    }

    writeValue(value: string | null): void {
        const country = findCountry(value);
        this.selectedCode = country?.code ?? null;
        this.input.setValue(country?.code ?? '', { emitEvent: false });
    }

    registerOnChange(fn: (value: string | null) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouched = fn; }
    registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }
    setDisabledState(disabled: boolean): void { this.disabled = disabled; disabled ? this.input.disable({ emitEvent: false }) : this.input.enable({ emitEvent: false }); }

    validate(_: AbstractControl): ValidationErrors | null {
        return !this.input.value || !!findCountry(this.input.value) && this.selectedCode === findCountry(this.input.value)?.code
            ? null
            : { country: true };
    }
}
