import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HomeFacade } from './home.facade';
import { HomeWoodViewComponent } from './views/wood/home-wood-view.component';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { HomeMobileViewComponent } from './views/mobile/home-mobile-view.component';

@Component({
    standalone: true,
    selector:  'app-home',
    imports: [HomeWoodViewComponent, HomeMobileViewComponent],
    providers: [HomeFacade],
    template: `
        @if (presentation.state().isMobilePresentationActive) {
            <app-home-mobile-view [readingQuote]="facade.readingQuote()"></app-home-mobile-view>
        } @else {
            <app-home-wood-view [readingQuote]="facade.readingQuote()"></app-home-wood-view>
        }
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
})
export class HomeComponent {
    constructor(
        readonly facade: HomeFacade,
        readonly presentation: PresentationModeService
    ) { }
}
