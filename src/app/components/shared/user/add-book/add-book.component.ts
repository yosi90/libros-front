import { Component, OnInit } from '@angular/core';
import { User } from '../../../../interfaces/user';
import { LoginService } from '../../../../services/auth/login.service';
import { UserService } from '../../../../services/entities/user.service';
import { Router } from '@angular/router';
import { MatCard, MatCardContent } from '@angular/material/card';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { MatTooltip } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-add-book',
    standalone: true,
    imports: [MatCard, MatCardContent, NgxDropzoneModule, MatTooltip, CommonModule],
    templateUrl: './add-book.component.html',
    styleUrl: './add-book.component.sass'
})
export class AddBookComponent {
}