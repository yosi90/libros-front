import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';
import type { SocialShellComponent } from '../../../shared/user-pages/social-shell/social-shell.component';

@Component({
    selector: 'app-mobile-social-shell',
    standalone: true,
    imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet, YosiftwareMarkComponent],
    templateUrl: './mobile-social-shell.component.html',
    styleUrl: './mobile-social-shell.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileSocialShellComponent {
    @Input({ required: true }) controller!: SocialShellComponent;

    get c(): SocialShellComponent { return this.controller; }
}
