import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ReadingReturnService } from '../../../../services/navigation/reading-return.service';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';

/** Contenido de la ventana flotante «Estabas leyendo» (escritorio en Web y Wood). */
@Component({
    selector: 'app-floating-reading',
    standalone: true,
    imports: [AsyncPipe, MatIconModule, CoverCachePipe],
    templateUrl: './floating-reading.component.html',
    styleUrl: './floating-reading.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloatingReadingComponent {
    constructor(readonly reading: ReadingReturnService) { }
}
