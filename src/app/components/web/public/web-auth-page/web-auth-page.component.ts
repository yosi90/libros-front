import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ReadingQuote } from '../../../../shared/reading-quotes';
import { WebPublicShellComponent } from '../web-public-shell/web-public-shell.component';

/**
 * Página Web de acceso: presentación con la cita lectora a un lado y el
 * formulario en tarjeta al otro; en pantallas estrechas, una sola columna.
 * Sus estilos de formulario (`.web-auth-*`) sirven a todas las vistas públicas.
 */
@Component({
    selector: 'app-web-auth-page',
    standalone: true,
    imports: [WebPublicShellComponent],
    templateUrl: './web-auth-page.component.html',
    styleUrl: './web-auth-page.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebAuthPageComponent {
    @Input({ required: true }) eyebrow = '';
    @Input({ required: true }) title = '';
    @Input() supporting = '';
    @Input() backLink: string | null = '/home';
    @Input() readingQuote: ReadingQuote | null = null;
}
