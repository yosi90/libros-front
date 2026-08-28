import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-mobile-app-bar',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './mobile-app-bar.component.html',
    styleUrl: './mobile-app-bar.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileAppBarComponent {
    @Input() eyebrow = 'Memoria Bibliográfica';
    @Input({ required: true }) title = '';
    @Input() leadingIcon = 'auto_stories';
    @Input() leadingLabel = 'Inicio';
    @Input() actionIcon: string | null = null;
    @Input() actionLabel = 'Más opciones';
    @Output() leadingAction = new EventEmitter<void>();
    @Output() trailingAction = new EventEmitter<void>();
}
