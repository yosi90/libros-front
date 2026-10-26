import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BookTitleState } from '../../../shared/common/book-title/book-title.state';
import { BookTitleBannerComponent } from '../../../shared/common/book-title/book-title-banner.component';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

/**
 * «Tu título» en la Web: la frase divertida de la persona para el libro, editable a mano o generada con IA. El estado
 * es de la fachada (`BookTitleState`); la cabecera del bloque la pone quien lo aloja. La frase va como texto o, si la
 * IA trajo su cabecera animada, en el marco aislado de `BookTitleBannerComponent`.
 */
@Component({
    selector: 'app-web-book-title',
    standalone: true,
    imports: [FormsModule, MatIconModule, BookTitleBannerComponent, YosiftwareMarkComponent],
    templateUrl: './web-book-title.component.html',
    styleUrl: './web-book-title.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookTitleComponent {
    @Input({ required: true }) state!: BookTitleState;
    /** `summary`: el resumen del libro (cabecera grande); `card`: la tarjeta «Mi biblioteca» (franja y «Ver en grande»). */
    @Input() mode: 'summary' | 'card' = 'card';
    /** Alto de la cabecera en px; null deja el del modo. */
    @Input() bannerHeight: number | null = null;
}
