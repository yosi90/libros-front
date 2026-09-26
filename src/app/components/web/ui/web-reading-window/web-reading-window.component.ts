import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { ReadingReturnService } from '../../../../services/navigation/reading-return.service';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';

/**
 * Libro que se estaba leyendo. En pantallas grandes es una ventana flotante como
 * las de Mensajes (plegable a píldora); en móvil, la chip de la APK.
 */
@Component({
    selector: 'app-web-reading-window',
    standalone: true,
    imports: [AsyncPipe, MatIconModule, MatTooltipModule, CoverCachePipe],
    templateUrl: './web-reading-window.component.html',
    styleUrl: './web-reading-window.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebReadingWindowComponent {
    readonly collapsed = signal(false);

    constructor(readonly reading: ReadingReturnService, private layout: AdaptiveLayoutService) { }

    get isCompact(): boolean { return this.layout.state().isCompact; }

    toggle(): void {
        this.collapsed.update(value => !value);
    }
}
