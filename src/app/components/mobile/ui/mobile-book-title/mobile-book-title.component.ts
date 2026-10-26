import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { BookTitleBannerComponent } from '../../../shared/common/book-title/book-title-banner.component';
import { BookTitleView } from '../../../shared/common/book-title/book-title-view';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

/**
 * «Tu título» en Mobile (referencia del clon Kotlin): la cabecera de la IA (a sangre en el resumen) o la frase, con un
 * único botón de opciones que abre su panel. El estado es de la fachada (`BookTitleState`).
 */
@Component({
    selector: 'app-mobile-book-title',
    standalone: true,
    imports: [A11yModule, OverlayModule, FormsModule, MatIconModule, BookTitleBannerComponent, YosiftwareMarkComponent],
    templateUrl: './mobile-book-title.component.html',
    styleUrl: './mobile-book-title.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookTitleComponent extends BookTitleView { }
