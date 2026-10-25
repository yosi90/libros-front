import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { YosiftwareAccountComponent } from '../../../../shared/common/yosiftware-account/yosiftware-account.component';
import { YosiftwareNotificationsComponent } from '../../../../shared/common/yosiftware-notifications/yosiftware-notifications.component';
import { YosiftwareWebsComponent } from '../../../../shared/common/yosiftware-webs/yosiftware-webs.component';
import { YosiftwareMarkComponent } from '../../../../shared/common/yosiftware-mark/yosiftware-mark.component';
import { ReadingQuote } from '../../../../../shared/reading-quotes';
import { WebPublicShellComponent } from '../../../../web/public/web-public-shell/web-public-shell.component';

@Component({
    standalone: true,
    selector: 'app-home-web-view',
    imports: [YosiftwareAccountComponent, YosiftwareWebsComponent, YosiftwareNotificationsComponent, YosiftwareMarkComponent, MatIconModule, WebPublicShellComponent],
    templateUrl: './home-web-view.component.html',
    styleUrl: './home-web-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeWebViewComponent {
    @Input({ required: true }) readingQuote!: ReadingQuote;
    /** Por qué todavía no se puede entrar en la biblioteca (cargando, sin conexión, cuenta borrada…). */
    @Input() notice: string | null = null;
    @Input() canRetry = false;
    /** Las normas comunes y la política de privacidad de Yosiftware (se ven sin entrar). */
    @Input() normsUrl = '';
    /** Abre el acceso de Yosiftware: entrar o crear la cuenta. */
    @Output() readonly entrar = new EventEmitter<'entrar' | 'registro'>();
    @Output() readonly retry = new EventEmitter<void>();
}
