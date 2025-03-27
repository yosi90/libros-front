import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    standalone: true,
    selector:  'app-book-router',
    imports: [RouterOutlet],
    templateUrl: './book-router.component.html',
    styleUrl: './book-router.component.sass'
})
export class BookRouterComponent {

}
