import { AbstractControl, ValidationErrors } from '@angular/forms';

export function normalizeIsbn(value: string): string {
    return value.replace(/[\s-]/g, '').toUpperCase();
}

/** Valida formato, prefijo editorial y digito de control, sin convertir ISBN-10. */
export function isValidIsbn(value: string): boolean {
    const isbn = normalizeIsbn(value);
    if (/^(978|979)\d{10}$/.test(isbn)) {
        return [...isbn].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0) % 10 === 0;
    }
    if (/^\d{9}[\dX]$/.test(isbn) && !/^0+$/.test(isbn)) {
        return [...isbn].reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0;
    }
    return false;
}

/** El ISBN vacio se admite para fichas historicas; required lo exige en las altas de edicion. */
export function optionalIsbnValidator(control: AbstractControl<string | null>): ValidationErrors | null {
    return !control.value?.trim() || isValidIsbn(control.value) ? null : { isbn: true };
}
