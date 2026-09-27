import { ChangeDetectionStrategy, Component, computed, effect, untracked } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { READING_WINDOW_ID, ReadingReturnService } from '../../../../services/navigation/reading-return.service';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { FloatingWindowManagerService } from '../../../../services/stores/floating-window-manager.service';

/**
 * Libro que se estaba leyendo. En el escritorio (el mismo en el que caben las
 * ventanas de Mensajes) es una ventana flotante del gestor de ventanas; en el
 * resto, la píldora de la APK.
 */
@Component({
    selector: 'app-web-reading-window',
    standalone: true,
    imports: [AsyncPipe, MatIconModule, CoverCachePipe],
    templateUrl: './web-reading-window.component.html',
    styleUrl: './web-reading-window.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebReadingWindowComponent {
    /** Escritorio con sitio para ventanas flotantes. */
    readonly asWindow = computed(() => {
        this.layout.state();
        this.presentation.state();
        return this.chatFloating.isCompatible();
    });
    private readonly openWindows = toSignal(this.windows.windows$, { initialValue: [] });

    constructor(
        readonly reading: ReadingReturnService,
        private layout: AdaptiveLayoutService,
        private presentation: PresentationModeService,
        private chatFloating: ChatFloatingCoordinatorService,
        private windows: FloatingWindowManagerService
    ) {
        effect(() => {
            const parked = this.reading.parked();
            const asWindow = this.asWindow();
            const isOpen = this.openWindows().some(item => item.id === READING_WINDOW_ID && item.open);
            untracked(() => {
                if (parked && asWindow && !isOpen)
                    this.windows.open(READING_WINDOW_ID, 'Estabas leyendo', this.placement());
                else if ((!parked || !asWindow) && isOpen)
                    this.windows.close(READING_WINDOW_ID);
            });
        });
    }

    /** Abajo a la derecha, lejos del listado de chats (arriba a la derecha). */
    private placement() {
        return { left: Math.max(12, window.innerWidth - 356), top: Math.max(12, window.innerHeight - 256), width: 336, height: 232 };
    }
}
