import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { WebThemeService } from '../../../../services/ui/web-theme.service';

/**
 * Marco Web de la zona pública: barra con la marca, acciones opcionales y el
 * cambio claro/oscuro del dispositivo (antes de iniciar sesión no hay cuenta
 * donde guardarlo).
 */
@Component({
    selector: 'app-web-public-shell',
    standalone: true,
    imports: [MatIconModule, RouterLink],
    templateUrl: './web-public-shell.component.html',
    styleUrl: './web-public-shell.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebPublicShellComponent {
    @Input() backLink: string | null = null;
    @Input() backLabel = 'Volver al inicio';

    constructor(readonly theme: WebThemeService) { }

    get isDark(): boolean { return this.theme.choice() === 'dark'; }

    toggleTheme(): void {
        this.theme.select(this.isDark ? 'light' : 'dark');
    }
}
