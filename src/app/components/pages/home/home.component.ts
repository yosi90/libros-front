import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HomeFacade } from './home.facade';
import { HomeWoodViewComponent } from './views/wood/home-wood-view.component';

@Component({
    standalone: true,
    selector:  'app-home',
    imports: [HomeWoodViewComponent],
    providers: [HomeFacade],
    template: '<app-home-wood-view [readingQuote]="facade.readingQuote()"></app-home-wood-view>',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
})
export class HomeComponent {
    constructor(readonly facade: HomeFacade) { }
}
