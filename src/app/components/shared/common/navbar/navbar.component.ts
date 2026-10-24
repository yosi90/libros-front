import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { YosiftwareAccountComponent } from '../yosiftware-account/yosiftware-account.component';
import { YosiftwareNotificationsComponent } from '../yosiftware-notifications/yosiftware-notifications.component';
import { YosiftwareWebsComponent } from '../yosiftware-webs/yosiftware-webs.component';

@Component({
    standalone: true,
    selector:  'app-navbar',
    imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, YosiftwareAccountComponent, YosiftwareNotificationsComponent, YosiftwareWebsComponent],
    templateUrl: './navbar.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    canAccessLibrary: boolean = false;

    get isUserAdmin(): boolean {
        return this.sessionSrv.isAdmin;
    }

    constructor(private sessionSrv: PlatformSessionService, private loader: LoaderEmmitterService, public router: Router, private adaptiveLayout: AdaptiveLayoutService,
        private presentation: PresentationModeService) { }

    get showLegacyLoggedNav(): boolean {
        // La presentación Web trae su propia navegación (y el libro, su cabecera).
        return this.canAccessLibrary && this.adaptiveLayout.snapshot.isDesktop && !this.router.url.startsWith('/dashboard')
            && this.presentation.snapshot.activeMode !== 'web';
    }

    ngOnInit(): void {
        this.sessionSrv.userIsLogged$.subscribe(logged => this.canAccessLibrary = logged);
    }

    openLibrary(event: MouseEvent): void {
        event.preventDefault();
        this.loader.activateLoader();
        requestAnimationFrame(() => void this.router.navigate(['/dashboard']));
    }
}
