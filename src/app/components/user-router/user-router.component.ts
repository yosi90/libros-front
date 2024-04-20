import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-user-router',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './user-router.component.html',
  styleUrl: './user-router.component.sass'
})
export class UserRouterComponent {

}
