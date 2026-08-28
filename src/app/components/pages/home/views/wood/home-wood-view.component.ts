import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ReadingQuote } from '../../../../../shared/reading-quotes';

@Component({
    standalone: true,
    selector: 'app-home-wood-view',
    imports: [RouterLink, MatIconModule],
    templateUrl: './home-wood-view.component.html',
    styleUrl: './home-wood-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeWoodViewComponent {
    @Input({ required: true }) readingQuote!: ReadingQuote;
}
