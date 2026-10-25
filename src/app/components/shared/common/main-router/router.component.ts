import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';

@Component({
    standalone: true,
    selector: 'app-router',
    imports: [RouterOutlet],
    templateUrl: './router.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './router.component.sass'
})
export class RouterComponent {
    constructor(public session: PlatformSessionService) { }
}
