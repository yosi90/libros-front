import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { UserRouterComponent } from '../../user-router/user-router.component';
import { SessionService } from '../../../services/auth/session.service';
import { environment } from '../../../../environment/environment';

@Component({
    standalone: true,
    selector:  'app-dahsboard',
    imports: [
        MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, CommonModule, MatTooltipModule, NgxDropzoneModule,
        RouterLink, RouterLinkActive, UserRouterComponent
    ],
    templateUrl: './dahsboard.component.html',
    styleUrl: './dahsboard.component.sass'
})
export class DahsboardComponent implements OnInit {
    imgUrl = environment.getImgUrl;
    
    viewportSize!: { width: number, height: number };
    imageCacheBuster: number = Date.now();

    get userData() {
        return this.sessionSrv.userObject;
    }

    get isUserAdmin(): boolean {
        return this.sessionSrv.userRole.Nombre === 'administrador';
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private sessionSrv: SessionService) { }

    ngOnInit(): void {
        this.getViewportSize();
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    handleProfileImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    logout(): void {
        this.sessionSrv.logout();
    }
}
