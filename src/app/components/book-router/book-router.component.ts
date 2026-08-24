import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    standalone: true,
    selector:  'app-book-router',
    imports: [RouterOutlet],
    templateUrl: './book-router.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './book-router.component.sass'
})
export class BookRouterComponent {

}
