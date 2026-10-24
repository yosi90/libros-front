import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { YosiftwareAccountComponent } from '../../../../shared/common/yosiftware-account/yosiftware-account.component';
import { YosiftwareMarkComponent } from '../../../../shared/common/yosiftware-mark/yosiftware-mark.component';
import { MobilePublicShellComponent } from '../../../../mobile/public/mobile-public-shell/mobile-public-shell.component';
import { ReadingQuote } from '../../../../../shared/reading-quotes';

@Component({
    selector: 'app-home-mobile-view',
    standalone: true,
    imports: [YosiftwareAccountComponent, YosiftwareMarkComponent, MatIconModule, MobilePublicShellComponent],
    templateUrl: './home-mobile-view.component.html',
    styleUrl: './home-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeMobileViewComponent {
    @Input({ required: true }) readingQuote!: ReadingQuote;
    /** Por qué todavía no se puede entrar en la biblioteca (cargando, sin conexión, cuenta borrada…). */
    @Input() notice: string | null = null;
    @Input() canRetry = false;
    /** Abre el acceso de Yosiftware: entrar o crear la cuenta. */
    @Output() readonly entrar = new EventEmitter<'entrar' | 'registro'>();
    @Output() readonly retry = new EventEmitter<void>();
}
