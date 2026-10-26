import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BookTitleBannerComponent } from './book-title-banner.component';
import { BookTitleView } from './book-title-view';
import { YosiftwareMarkComponent } from '../yosiftware-mark/yosiftware-mark.component';

/**
 * «Tu título» en Wood: la cabecera de la IA o la frase, con un único botón de opciones que abre su panel, en el
 * lenguaje de cuero y dorados. El estado es de la fachada (`BookTitleState`).
 */
@Component({
    selector: 'app-wood-book-title',
    standalone: true,
    imports: [A11yModule, OverlayModule, FormsModule, MatIconModule, BookTitleBannerComponent, YosiftwareMarkComponent],
    templateUrl: './wood-book-title.component.html',
    styleUrl: './wood-book-title.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WoodBookTitleComponent extends BookTitleView { }
