import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ReadingQuote } from '../../../../shared/reading-quotes';
import { MobilePublicShellComponent } from '../mobile-public-shell/mobile-public-shell.component';

@Component({
    selector: 'app-mobile-auth-page',
    standalone: true,
    imports: [MobilePublicShellComponent],
    templateUrl: './mobile-auth-page.component.html',
    styleUrl: './mobile-auth-page.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileAuthPageComponent {
    @Input({ required: true }) eyebrow = '';
    @Input({ required: true }) title = '';
    @Input() supporting = '';
    @Input() backLink: string | null = '/home';
    @Input() readingQuote: ReadingQuote | null = null;
    @Input() showQuoteCompact = false;
}
