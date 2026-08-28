import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MobilePublicShellComponent } from '../../../../mobile/public/mobile-public-shell/mobile-public-shell.component';
import { ReadingQuote } from '../../../../../shared/reading-quotes';

@Component({
    selector: 'app-home-mobile-view',
    standalone: true,
    imports: [MatIconModule, RouterLink, MobilePublicShellComponent],
    templateUrl: './home-mobile-view.component.html',
    styleUrl: './home-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeMobileViewComponent {
    @Input({ required: true }) readingQuote!: ReadingQuote;
}
