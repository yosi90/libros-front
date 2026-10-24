import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Fechas de publicación parciales, como las guarda el backend: «2016», «2016-11» o «2016-11-22».
 * Las usan el editor de libros de Administración y las peticiones de catálogo.
 */
const ISO_PUBLICATION_DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

function isRealDate(year: string, month?: string, day?: string): boolean {
    const monthNumber = month ? Number(month) : 1;
    const dayNumber = day ? Number(day) : 1;
    if (monthNumber < 1 || monthNumber > 12)
        return false;
    // setUTCFullYear, no Date.UTC: este convierte los años 0-99 en 1900-1999.
    const date = new Date(0);
    date.setUTCFullYear(Number(year), monthNumber - 1, dayNumber);
    return date.getUTCDate() === dayNumber;
}

/** «2016», «2016-11» o «2016-11-22», y que la fecha exista (no vale «2008-02-30»). */
export function isIsoPublicationDate(value: string): boolean {
    const iso = value.match(ISO_PUBLICATION_DATE);
    return !!iso && isRealDate(iso[1], iso[2], iso[3]);
}

/**
 * Convierte lo escrito en el campo («2016», «11/2016», «22/11/2016» o su forma ISO)
 * al formato que acepta el backend: «2016», «2016-11» o «2016-11-22».
 * Devuelve null si está vacío y undefined si no es una fecha válida.
 */
export function publicationDatePayload(value: string | null | undefined): string | null | undefined {
    const text = value?.trim() ?? '';
    if (!text)
        return null;
    const local = text.match(/^(?:(\d{1,2})\/)?(?:(\d{1,2})\/)?(\d{4})$/);
    const iso = text.match(ISO_PUBLICATION_DATE);
    let year: string, month: string | undefined, day: string | undefined;
    if (iso) {
        [, year, month, day] = iso;
    } else if (local) {
        const [, first, second, localYear] = local;
        year = localYear;
        // «11/2016» es mes y año; «22/11/2016», día, mes y año.
        [day, month] = second ? [first, second] : [undefined, first];
    } else {
        return undefined;
    }
    if (!isRealDate(year, month, day))
        return undefined;
    const pad = (part: string) => part.padStart(2, '0');
    return [year, month && pad(month), day && pad(day)].filter(Boolean).join('-');
}

/** Muestra una fecha del backend como la escribiría una persona: «22/11/2016», «11/2016» o «2016». */
export function publicationDateInput(value: string | null | undefined): string {
    const match = value?.trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
    if (!match)
        return '';
    const [, year, month, day] = match;
    return [day, month, year].filter(Boolean).join('/');
}

export function publicationDateValidator(control: AbstractControl<string | null>): ValidationErrors | null {
    return publicationDatePayload(control.value) === undefined ? { publicationDate: true } : null;
}
