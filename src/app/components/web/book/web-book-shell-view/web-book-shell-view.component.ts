import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BookRouterComponent } from '../../../book-router/book-router.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import type { BookComponent } from '../../../shared/book-pages/book/book.component';
import { BookSaveIndicatorService } from '../../../../services/ui/book-save-indicator.service';

/** Marco Web del libro: cabecera con secciones, índice lateral y contenido de la subruta. */
@Component({
    selector: 'app-web-book-shell-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
        MatTooltipModule, BookRouterComponent, CoverCachePipe],
    templateUrl: './web-book-shell-view.component.html',
    styleUrl: './web-book-shell-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookShellViewComponent {
    @Input({ required: true }) controller!: BookComponent;

    constructor(public saveIndicator: BookSaveIndicatorService, private router: Router) { }

    get c(): BookComponent { return this.controller; }

    get authorNames(): string {
        return (this.c.book.Autores ?? []).map(author => author.Nombre).filter(Boolean).join(', ');
    }

    /** Primer segmento tras `/book/:id`: `characters`, `character`, `chapter`… */
    get activeSection(): string {
        const segments = this.router.url.split('?')[0].split('/');
        return segments[3] ?? '';
    }

    isSectionActive(...routes: string[]): boolean {
        return routes.includes(this.activeSection);
    }

    get isOverlayIndex(): boolean { return !this.c.isDesktopLayout; }

    @HostListener('document:keydown.escape')
    closeOverlays(): void {
        if (this.c.structureEditorKind) {
            this.c.closeStructureEditor();
            return;
        }
        if (this.isOverlayIndex && this.c.bookIndexOpen) this.c.bookIndexOpen = false;
    }
}
