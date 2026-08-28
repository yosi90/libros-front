import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-mobile-state',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './mobile-state.component.html',
    styleUrl: './mobile-state.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileStateComponent {
    @Input() kind: 'empty' | 'loading' = 'empty';
    @Input() icon = 'auto_stories';
    @Input() title = '';
    @Input() detail = '';
    @Input() actionLabel = '';
}
