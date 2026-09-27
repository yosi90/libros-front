import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SagaLink } from '../../../../interfaces/saga';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { sagaLinkLabel } from '../../../../shared/saga-chain';
import { CatalogSagaController } from './catalog-saga.model';

/**
 * Ficha de saga del catálogo: universo, autores, la cadena de lectura
 * («Continúa a» / «Continúa en», navegables) y sus títulos. Panel lateral en
 * escritorio y pantalla completa en móvil.
 */
@Component({
    selector: 'app-catalog-saga-sheet',
    standalone: true,
    imports: [AsyncPipe, MatIconModule, CoverCachePipe],
    templateUrl: './catalog-saga-sheet.component.html',
    styleUrl: './catalog-saga-sheet.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class CatalogSagaSheetComponent {
    @Input({ required: true }) controller!: CatalogSagaController;

    get c(): CatalogSagaController { return this.controller; }

    linkLabel(link: SagaLink): string {
        return sagaLinkLabel(link, this.c.selectedSaga ?? undefined);
    }

    authorsLabel(): string {
        return (this.c.selectedSaga?.Autores ?? []).map(author => author.Nombre).join(', ');
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.c.isSagaOpen) this.c.closeSaga();
    }
}
