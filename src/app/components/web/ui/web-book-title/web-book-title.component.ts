import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BookTitleBannerComponent } from '../../../shared/common/book-title/book-title-banner.component';
import { BookTitleView } from '../../../shared/common/book-title/book-title-view';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

/**
 * «Tu título» en la Web: la cabecera de la IA (en un marco aislado) o la frase, con un único botón de opciones que
 * abre su panel (generar con IA, editar la frase, ver en grande). El estado es de la fachada (`BookTitleState`).
 */
@Component({
    selector: 'app-web-book-title',
    standalone: true,
    imports: [A11yModule, OverlayModule, FormsModule, MatIconModule, BookTitleBannerComponent, YosiftwareMarkComponent],
    templateUrl: './web-book-title.component.html',
    styleUrl: './web-book-title.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookTitleComponent extends BookTitleView { }
