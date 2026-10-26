import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BookTitleState } from '../../../shared/common/book-title/book-title.state';
import { BookTitleBannerComponent } from '../../../shared/common/book-title/book-title-banner.component';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

/**
 * «Tu título» en Mobile (referencia del clon Kotlin): la frase divertida de la persona para el libro, editable a mano o
 * generada con IA. El estado es de la fachada (`BookTitleState`); la cabecera la pone quien lo aloja.
 */
@Component({
    selector: 'app-mobile-book-title',
    standalone: true,
    imports: [FormsModule, MatIconModule, BookTitleBannerComponent, YosiftwareMarkComponent],
    templateUrl: './mobile-book-title.component.html',
    styleUrl: './mobile-book-title.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookTitleComponent {
    @Input({ required: true }) state!: BookTitleState;
    /** `summary`: el resumen del libro (cabecera grande); `card`: la tarjeta «Mi biblioteca» (franja y «Ver en grande»). */
    @Input() mode: 'summary' | 'card' = 'card';
    /** Alto de la cabecera en px; null deja el del modo. */
    @Input() bannerHeight: number | null = null;
}
