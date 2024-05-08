import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { LoginService } from '../../../../services/auth/login.service';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import {
    MatBottomSheet,
    MatBottomSheetModule,
    MatBottomSheetRef,
  } from '@angular/material/bottom-sheet';
import { MenuSheetComponent } from '../../menu-sheet/menu-sheet.component';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [NgbCollapse, RouterLink, CommonModule, DragDropModule, MatButtonModule, MatBottomSheetModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    viewportSize!: { width: number, height: number };

    isUserLogged: Boolean = false;
    isUserAdmin: boolean = false;
    isNavbarCollapsed = true;

    @ViewChild('mobileMenu') mobileMenu!: ElementRef;
    menuInitialX: number = 0;
    menuInitialY: number = 0;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
        this._bottomSheet.dismiss();
    }

    constructor(private loginSrv: LoginService, private _bottomSheet: MatBottomSheet) { }

    ngOnInit(): void {
        this.getViewportSize();
        this.loginSrv.userLogged.subscribe({
            next: (userLogged) => {
                this.isUserLogged = userLogged;
                if (this.isUserLogged === true)
                    this.loginSrv.isAdmin.subscribe({
                        next: (isAdmin) => {
                            this.isUserAdmin = isAdmin;
                        }
                    });
                else
                    this.isUserAdmin = false;
            }
        });
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
        this.loginSrv.logout();
    }
}
