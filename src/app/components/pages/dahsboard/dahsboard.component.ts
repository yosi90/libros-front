import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { User } from '../../../interfaces/user';
import { UserService } from '../../../services/entities/user.service';
import { LoginService } from '../../../services/auth/login.service';
import { JwtInterceptorService } from '../../../services/auth/jwt-interceptor.service';
import { ErrorInterceptorService } from '../../../services/auth/error-interceptor.service';
import { Router, RouterLink } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { UserRouterComponent } from '../../user-router/user-router.component';

@Component({
    selector: 'app-dahsboard',
    standalone: true,
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        CommonModule,
        MatTooltipModule,
        NgxDropzoneModule,
        RouterLink,
        UserRouterComponent
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: JwtInterceptorService,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ErrorInterceptorService,
            multi: true,
        },
    ],
    templateUrl: './dahsboard.component.html',
    styleUrl: './dahsboard.component.sass',
})
export class DahsboardComponent implements OnInit {
    viewportSize!: { width: number, height: number };

    userData?: User;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private loginSrv: LoginService, private userSrv: UserService, private router: Router) { }

    ngOnInit(): void {
        this.getViewportSize();
        const token = this.loginSrv.token;
        if (token != null && token != '') {
            this.userSrv.getUser(token).subscribe({
                next: async (user) => {
                    this.userData = user;
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
        }
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
