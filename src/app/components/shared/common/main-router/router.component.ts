import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';

@Component({
    standalone: true,
    selector: 'app-router',
    imports: [RouterOutlet],
    templateUrl: './router.component.html',
    styleUrl: './router.component.sass'
})
export class RouterComponent {
    constructor(public session: SessionService) { }
}
