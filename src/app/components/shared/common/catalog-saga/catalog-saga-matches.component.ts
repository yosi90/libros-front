import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Saga } from '../../../../interfaces/saga';
import { CatalogSagaController } from './catalog-saga.model';

/** Sagas que coinciden con la búsqueda del catálogo; cada una abre su ficha. */
@Component({
    selector: 'app-catalog-saga-matches',
    standalone: true,
    imports: [MatIconModule],
    template: `
        @if (controller.sagaMatches.length) {
          <section class="saga-matches" aria-label="Sagas que coinciden">
            <span class="saga-matches__label">Sagas</span>
            @for (saga of controller.sagaMatches; track saga.Id) {
              <button class="saga-matches__chip" type="button" (click)="controller.openSaga(saga.Id)">
                <mat-icon aria-hidden="true">collections_bookmark</mat-icon>{{label(saga)}}
              </button>
            }
          </section>
        }
    `,
    styleUrl: './catalog-saga-matches.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class CatalogSagaMatchesComponent {
    @Input({ required: true }) controller!: CatalogSagaController;

    label(saga: Saga): string {
        return saga.Subtitulo ? `${saga.Nombre} · ${saga.Subtitulo}` : saga.Nombre;
    }
}
