import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { User } from '../../../interfaces/user';
import { UserService } from '../../../services/entities/user.service';
import { SessionService } from '../../../services/auth/session.service';
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
        MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, CommonModule, MatTooltipModule, NgxDropzoneModule,
        RouterLink, UserRouterComponent
    ],
    templateUrl: './dahsboard.component.html',
    styleUrl: './dahsboard.component.sass',
})
export class DahsboardComponent implements OnInit {
    userData?: User;
    
    viewportSize!: { width: number, height: number };

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private sessionSrv: SessionService) { }

    ngOnInit(): void {
        this.getViewportSize();
        this.sessionSrv.user.subscribe(user => {
            this.userData = user;
        });
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
