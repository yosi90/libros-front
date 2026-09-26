import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';
import { getBackendErrorText } from './api-error-message';

/** Campo que el backend señala en su error (`field`), si lo hay. */
export function getApiErrorField(error: unknown): string | null {
    if (error instanceof HttpErrorResponse)
        return getApiErrorField(error.error);
    if (!error || typeof error !== 'object')
        return null;
    const body = error as Record<string, unknown>;
    const field = body['field'];
    if (typeof field === 'string' && field.trim())
        return field.trim();
    const raw = body['raw'];
    return raw && raw !== error ? getApiErrorField(raw) : null;
}

/**
 * Marca en rojo el control que corresponde al `field` del error del backend,
 * con su texto como mensaje (`control.getError('server')`). El error se retira
 * solo en cuanto el campo cambia, porque los validadores vuelven a ejecutarse.
 * Devuelve el control marcado, o null si el campo no está en el formulario.
 */
export function markBackendFieldError(controls: Record<string, AbstractControl | null | undefined>, error: unknown): AbstractControl | null {
    const field = getApiErrorField(error);
    if (!field) return null;
    const key = Object.keys(controls).find(name => name.toLocaleLowerCase() === field.toLocaleLowerCase());
    const control = key ? controls[key] : null;
    if (!control) return null;
    control.setErrors({ ...(control.errors ?? {}), server: getBackendErrorText(error) ?? 'Revisa este campo.' });
    control.markAsTouched();
    return control;
}
