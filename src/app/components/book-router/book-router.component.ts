import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-book-router',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './book-router.component.html',
  styleUrl: './book-router.component.sass'
})
export class BookRouterComponent {

}
