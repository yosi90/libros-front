import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { SessionService } from '../../../../services/auth/session.service';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import {
    MatBottomSheet,
    MatBottomSheetModule,
    MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MenuSheetComponent } from '../../menu-sheet/menu-sheet.component';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../../environment/environment';
import { User } from '../../../../interfaces/user';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [NgbCollapse, RouterLink, CommonModule, DragDropModule, MatButtonModule, MatBottomSheetModule, MatIconModule, MatTooltipModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    imgUrl = environment.apiUrl;
    viewportSize!: { width: number, height: number };

    isUserLogged: Boolean = false;
    isUserAdmin: boolean = false;
    isNavbarCollapsed = true;

    userData: User = {
        userId: -1,
        name: '',
        email: '',
        image: ''
    };

    @ViewChild('mobileMenu') mobileMenu!: ElementRef;
    menuInitialX: number = 0;
    menuInitialY: number = 0;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
        this._bottomSheet.dismiss();
    }

    constructor(private sessionSrv: SessionService, private router: Router, private _bottomSheet: MatBottomSheet) { }

    ngOnInit(): void {
        this.getViewportSize();
        this.sessionSrv.userLogged.subscribe({
            next: (userLogged) => {
                this.isUserLogged = userLogged;
                if (this.isUserLogged === true) {
                    this.sessionSrv.isAdmin.subscribe({
                        next: (isAdmin) => {
                            this.isUserAdmin = isAdmin;
                        }
                    });
                    this.sessionSrv.user.subscribe(user => {
                        if (user === null) {
                            this.sessionSrv.logout('bo: Usuario fue null');
                            this.router.navigateByUrl('/home');
                        } else
                            this.userData = user;
                    });
                }
                else
                    this.isUserAdmin = false;
            }
        });
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
        this.sessionSrv.logout('na: Cierre de sesión normal');
    }
}
