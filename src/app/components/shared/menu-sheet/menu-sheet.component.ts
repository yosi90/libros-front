import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../../services/auth/login.service';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
    selector: 'app-menu-sheet',
    standalone: true,
    imports: [MatListModule, MatTooltipModule, MatIconModule, RouterLink, CommonModule],
    templateUrl: './menu-sheet.component.html',
    styleUrl: './menu-sheet.component.sass'
})
export class MenuSheetComponent implements OnInit {
    isUserLogged: Boolean = false;
    isUserAdmin: boolean = false;

    constructor(private loginSrv: LoginService, private thisMenu: MatBottomSheetRef<MenuSheetComponent>) {}

    ngOnInit(): void {
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

    logout(): void {
        this.selfClose();
        this.loginSrv.logout();
    }

    selfClose(): void {
        this.thisMenu.dismiss();
    }
}
