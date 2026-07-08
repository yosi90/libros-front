import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
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

@Component({
    standalone: true,
    selector:  'app-navbar',
    imports: [RouterLink, CommonModule, DragDropModule, MatButtonModule, MatBottomSheetModule, MatIconModule, MatTooltipModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    imgUrl = environment.getImgUrl;
    viewportSize!: { width: number, height: number };

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

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
        this._bottomSheet.dismiss();
    }

    constructor(private sessionSrv: SessionService, private _bottomSheet: MatBottomSheet, public router: Router) { }

    get showLegacyLoggedNav(): boolean {
        return this.canAccessLibrary && this.viewportSize?.width > 1050 && !this.router.url.startsWith('/dashboard');
    }

    get showMobileMenu(): boolean {
        return this.canAccessLibrary && this.viewportSize?.width <= 1050;
    }

    ngOnInit(): void {
        this.getViewportSize();

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

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    openMenuSheet(): void {
        this._bottomSheet.open(MenuSheetComponent);
    }

    logout(): void {
        this.sessionSrv.logout();
    }
}
