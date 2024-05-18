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
    
    userData: User = {
        userId: -1,
        name: '',
        email: '',
        image: ''
    };

    constructor(private sessionSrv: SessionService, private router: Router, private thisMenu: MatBottomSheetRef<MenuSheetComponent>) { }

    ngOnInit(): void {
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
                } else
                    this.isUserAdmin = false;
            }
        });
    }

    handleProfileImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    logout(): void {
        this.selfClose();
        this.sessionSrv.logout('ms: Cierre de sesión normal');
    }

    selfClose(): void {
        this.thisMenu.dismiss();
    }
}
