import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AutosaveStatus, autosaveStatusIcon } from '../../../../shared/autosave-status';

/**
 * El indicador de guardado de la Web («Cuaderno»): el capítulo y la ficha de un elemento, que se guardan solos. Icono
 * (que gira mientras se guarda) y texto, con el color del estado; quien lo usa decide cuándo se ve y dónde va.
 */
@Component({
    selector: 'app-web-save-status',
    standalone: true,
    imports: [MatIconModule],
    template: '<mat-icon aria-hidden="true" [class.is-spinning]="state === \'saving\'">{{icon}}</mat-icon><span>{{label}}</span>',
    styleUrl: './web-save-status.component.sass',
    host: { role: 'status', 'aria-live': 'polite', '[attr.data-state]': 'state' },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebSaveStatusComponent {
    @Input({ required: true }) state: AutosaveStatus = 'idle';
    @Input({ required: true }) label = '';

    get icon(): string { return autosaveStatusIcon(this.state); }
}
