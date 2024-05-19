import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../services/auth/session.service';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { environment } from '../../../../environment/environment';
import { User } from '../../../interfaces/user';

@Component({
    selector: 'app-menu-sheet',
    standalone: true,
    imports: [MatListModule, MatTooltipModule, MatIconModule, RouterLink, CommonModule],
    templateUrl: './menu-sheet.component.html',
    styleUrl: './menu-sheet.component.sass'
})
export class MenuSheetComponent implements OnInit {
    imgUrl = environment.apiUrl;
    isUserLogged: Boolean = false;
    isUserAdmin: boolean = false;

    userData!: User;

    constructor(private sessionSrv: SessionService, private router: Router, private thisMenu: MatBottomSheetRef<MenuSheetComponent>) { }

    ngOnInit(): void {
        this.sessionSrv.user.subscribe(user => {
            this.userData = user;
            this.isUserLogged = this.sessionSrv.userIsLogged;
            this.isUserAdmin = this.sessionSrv.isAdmin;
        });
    }

    handleProfileImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    logout(): void {
        this.selfClose();
        this.sessionSrv.logout();
    }

    selfClose(): void {
        this.thisMenu.dismiss();
    }
}
