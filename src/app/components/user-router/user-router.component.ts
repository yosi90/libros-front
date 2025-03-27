import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    standalone: true,
    selector:  'app-user-router',
    imports: [RouterOutlet],
    templateUrl: './user-router.component.html',
    styleUrl: './user-router.component.sass'
})
export class UserRouterComponent {

}
