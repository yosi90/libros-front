import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { LoginService } from '../../../services/auth/login.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [NgbCollapse, RouterLink],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    isUserLogged: Boolean = false;
    isNavbarCollapsed = true;

    constructor(private loginSrv: LoginService) {}

    ngOnInit(): void {
        this.loginSrv.userLogged.subscribe({
            next:(userLogged) => {
                this.isUserLogged = userLogged;
            }
        });
    }

    logout(): void {
        this.loginSrv.logout();
    }
}
