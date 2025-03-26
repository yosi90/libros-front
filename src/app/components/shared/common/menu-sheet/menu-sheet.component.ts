import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { environment } from '../../../../../environment/environment';
import { User } from '../../../../interfaces/user';
import { SessionService } from '../../../../services/auth/session.service';

@Component({
    selector: 'app-menu-sheet',
    standalone: true,
    imports: [MatListModule, MatTooltipModule, MatIconModule, RouterLink, CommonModule],
    templateUrl: './menu-sheet.component.html',
    styleUrl: './menu-sheet.component.sass'
})
export class MenuSheetComponent implements OnInit {
    imgUrl = environment.getImgUrl;

    userData!: User;
    imageCacheBuster: number = Date.now();

    constructor(private sessionSrv: SessionService, private router: Router, private thisMenu: MatBottomSheetRef<MenuSheetComponent>) { }

    ngOnInit(): void {
        this.userData = this.sessionSrv.userObject;
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
