import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BookTitleState } from './book-title.state';
import { BookTitleBannerComponent } from './book-title-banner.component';
import { YosiftwareMarkComponent } from '../yosiftware-mark/yosiftware-mark.component';

/**
 * «Tu título» en Wood: la frase divertida de la persona para el libro, editable a mano o generada con IA, con el
 * lenguaje de cuero y dorados. El estado es de la fachada (`BookTitleState`); la cabecera la pone quien lo aloja.
 */
@Component({
    selector: 'app-wood-book-title',
    standalone: true,
    imports: [FormsModule, MatIconModule, BookTitleBannerComponent, YosiftwareMarkComponent],
    templateUrl: './wood-book-title.component.html',
    styleUrl: './wood-book-title.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WoodBookTitleComponent {
    @Input({ required: true }) state!: BookTitleState;
    /** `summary`: el resumen del libro (cabecera grande); `card`: la tarjeta «Mi biblioteca» (franja y «Ver en grande»). */
    @Input() mode: 'summary' | 'card' = 'card';
    /** Alto de la cabecera en px; null deja el del modo. */
    @Input() bannerHeight: number | null = null;
}
