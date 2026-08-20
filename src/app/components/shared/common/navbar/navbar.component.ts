import { Component, DestroyRef, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import {
    MatBottomSheet,
    MatBottomSheetModule,
} from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../../environment/environment';
import { User } from '../../../../interfaces/user';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MenuSheetComponent } from '../menu-sheet/menu-sheet.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';

@Component({
    standalone: true,
    selector:  'app-navbar',
    imports: [RouterLink, CommonModule, DragDropModule, MatButtonModule, MatBottomSheetModule, MatIconModule, MatTooltipModule, NotificationBellComponent],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    imgUrl = environment.getImgUrl;
    userData!: User;

    imageCacheBuster: number = Date.now();

    canAccessLibrary: boolean = false;

    get isUserAdmin(): boolean {
        return this.sessionSrv.isAdmin;
    }

    isNavbarCollapsed = true;


    @ViewChild('mobileMenu') mobileMenu!: ElementRef;
    menuInitialX: number = 0;
    menuInitialY: number = 0;

    constructor(private sessionSrv: SessionService, private _bottomSheet: MatBottomSheet, private loader: LoaderEmmitterService, public router: Router, private adaptiveLayout: AdaptiveLayoutService, destroyRef: DestroyRef) {
        this.adaptiveLayout.state$
            .pipe(skip(1), takeUntilDestroyed(destroyRef))
            .subscribe(() => this._bottomSheet.dismiss());
    }

    get showLegacyLoggedNav(): boolean {
        return this.canAccessLibrary && this.adaptiveLayout.snapshot.isDesktop && !this.router.url.startsWith('/dashboard');
    }

    get showMobileMenu(): boolean {
        return this.canAccessLibrary && !this.adaptiveLayout.snapshot.isDesktop;
    }

    ngOnInit(): void {
        this.sessionSrv.userIsLogged$.subscribe(logged => {
            this.canAccessLibrary = logged && this.sessionSrv.canAccessLibrary;
            if (this.canAccessLibrary) {
                this.userData = this.sessionSrv.userObject;
                this.imageCacheBuster = Date.now();
            }
        });

        this.userData = this.sessionSrv.userObject;
    }

    handleProfileImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    openMenuSheet(): void {
        this._bottomSheet.open(MenuSheetComponent);
    }

    openLibrary(event: MouseEvent): void {
        event.preventDefault();
        this.loader.activateLoader();
        requestAnimationFrame(() => void this.router.navigate(['/dashboard']));
    }

    logout(): void {
        this.sessionSrv.logout();
    }
}
