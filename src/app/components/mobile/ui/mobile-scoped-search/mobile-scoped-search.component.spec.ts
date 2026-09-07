import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileScopedSearchComponent } from './mobile-scoped-search.component';

describe('MobileScopedSearchComponent', () => {
    let fixture: ComponentFixture<MobileScopedSearchComponent>;
    let component: MobileScopedSearchComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [MobileScopedSearchComponent] }).compileComponents();
        fixture = TestBed.createComponent(MobileScopedSearchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('does not open an empty scope panel when used as a direct search field', () => {
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'puente';
        input.dispatchEvent(new Event('input'));
        component.draftQuery = 'puente';
        fixture.detectChanges();

        expect(component.suggestionsOpen).toBeFalse();
        expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
    });

    it('retains scoped suggestions for library and catalog consumers', () => {
        component.scopes = [{ scope: 'contains', label: 'Contiene' }];
        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'puente';
        input.dispatchEvent(new Event('input'));
        component.draftQuery = 'puente';
        fixture.detectChanges();

        expect(component.suggestionsOpen).toBeTrue();
        expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
    });
});
