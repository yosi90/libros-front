import { Injectable, signal } from '@angular/core';
import { getRandomReadingQuote } from '../../../shared/reading-quotes';

/**
 * Estado de la ruta Home compartido por sus presentaciones.
 *
 * La cita se crea una sola vez por instancia de ruta, de modo que sustituir la
 * vista Wood por la futura vista Mobile no altere el contenido ni reinicie la
 * experiencia del usuario.
 */
@Injectable()
export class HomeFacade {
    readonly readingQuote = signal(getRandomReadingQuote());
}
