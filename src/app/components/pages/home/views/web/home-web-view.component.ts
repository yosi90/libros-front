import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ReadingQuote } from '../../../../../shared/reading-quotes';
import { WebPublicShellComponent } from '../../../../web/public/web-public-shell/web-public-shell.component';

@Component({
    standalone: true,
    selector: 'app-home-web-view',
    imports: [RouterLink, MatIconModule, WebPublicShellComponent],
    templateUrl: './home-web-view.component.html',
    styleUrl: './home-web-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeWebViewComponent {
    @Input({ required: true }) readingQuote!: ReadingQuote;
}
