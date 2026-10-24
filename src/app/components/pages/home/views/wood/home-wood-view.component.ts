import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { YosiftwareAccountComponent } from '../../../../shared/common/yosiftware-account/yosiftware-account.component';
import { YosiftwareNotificationsComponent } from '../../../../shared/common/yosiftware-notifications/yosiftware-notifications.component';
import { YosiftwareWebsComponent } from '../../../../shared/common/yosiftware-webs/yosiftware-webs.component';
import { YosiftwareMarkComponent } from '../../../../shared/common/yosiftware-mark/yosiftware-mark.component';
import { ReadingQuote } from '../../../../../shared/reading-quotes';

@Component({
    standalone: true,
    selector: 'app-home-wood-view',
    imports: [YosiftwareAccountComponent, YosiftwareWebsComponent, YosiftwareNotificationsComponent, YosiftwareMarkComponent, RouterLink, MatIconModule],
    templateUrl: './home-wood-view.component.html',
    styleUrl: './home-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeWoodViewComponent {
    @Input({ required: true }) readingQuote!: ReadingQuote;
    /** Por qué todavía no se puede entrar en la biblioteca (cargando, sin conexión, cuenta borrada…). */
    @Input() notice: string | null = null;
    @Input() canRetry = false;
    /** Abre el acceso de Yosiftware: entrar o crear la cuenta. */
    @Output() readonly entrar = new EventEmitter<'entrar' | 'registro'>();
    @Output() readonly retry = new EventEmitter<void>();
}
