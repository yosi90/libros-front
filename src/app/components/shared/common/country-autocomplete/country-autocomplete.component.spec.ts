import { CountryAutocompleteComponent } from './country-autocomplete.component';

describe('CountryAutocompleteComponent', () => {
    it('accepts only a selected catalogue option or an empty value', () => {
        const component = new CountryAutocompleteComponent();
        component.writeValue('ES');
        expect(component.validate({} as any)).toBeNull();

        component.input.setValue('Espana inventada');
        expect(component.validate({} as any)).toEqual({ country: true });

        component.clear({ preventDefault: () => undefined, stopPropagation: () => undefined } as any);
        expect(component.validate({} as any)).toBeNull();
    });

    it('emits the canonical ISO code after selecting an option', () => {
        const component = new CountryAutocompleteComponent();
        const changed = jasmine.createSpy('changed');
        const selected = jasmine.createSpy('selected');
        component.registerOnChange(changed);
        component.countrySelected.subscribe(selected);

        component.select({ option: { value: 'mx' } } as any);

        expect(changed).toHaveBeenCalledWith('MX');
        expect(selected).toHaveBeenCalledWith(jasmine.objectContaining({ code: 'MX', name: 'México' }));
        expect(component.validate({} as any)).toBeNull();
    });
});
