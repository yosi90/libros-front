import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-router',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './router.component.html',
  styleUrl: './router.component.sass'
})
export class RouterComponent {

}
