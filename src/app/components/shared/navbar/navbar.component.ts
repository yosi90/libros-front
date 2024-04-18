import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { LoginService } from '../../../services/auth/login.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [NgbCollapse, RouterLink, CommonModule],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.sass'
})
export class NavbarComponent implements OnInit {
    isUserLogged: Boolean = false;
    isUserAdmin: boolean = false;
    isNavbarCollapsed = true;

    constructor(private loginSrv: LoginService) { }

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
        this.loginSrv.logout();
    }
}
