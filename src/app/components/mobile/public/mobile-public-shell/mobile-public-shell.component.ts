import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-mobile-public-shell',
    standalone: true,
    imports: [MatIconModule, RouterLink],
    templateUrl: './mobile-public-shell.component.html',
    styleUrl: './mobile-public-shell.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobilePublicShellComponent {
    @Input() backLink: string | null = null;
    @Input() backLabel = 'Volver al inicio';
}
