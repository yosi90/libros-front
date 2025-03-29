import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { UserRouterComponent } from '../../user-router/user-router.component';

@Component({
    standalone: true,
    selector:  'app-dahsboard',
    imports: [
        MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, CommonModule, MatTooltipModule, NgxDropzoneModule,
        RouterLink, UserRouterComponent
    ],
    templateUrl: './dahsboard.component.html',
    styleUrl: './dahsboard.component.sass'
})
export class DahsboardComponent implements OnInit {
    
    viewportSize!: { width: number, height: number };

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor() { }

    ngOnInit(): void {
        this.getViewportSize();
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
