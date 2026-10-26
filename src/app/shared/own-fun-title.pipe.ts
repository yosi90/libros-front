import { Pipe, PipeTransform } from '@angular/core';

/**
 * El título divertido de la persona (`TituloPropio`) de una obra de la Biblioteca, como texto; vacío si no tiene o si
 * no es un libro. Las tarjetas solo enseñan la frase, nunca la cabecera animada.
 */
@Pipe({ name: 'ownFunTitle', standalone: true })
export class OwnFunTitlePipe implements PipeTransform {
    transform(item: unknown): string {
        const value = item && typeof item === 'object' ? (item as { TituloPropio?: unknown }).TituloPropio : null;
        return typeof value === 'string' ? value.trim() : '';
    }
}
