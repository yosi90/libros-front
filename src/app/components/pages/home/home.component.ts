import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [MatCardModule, RouterLink, MatDividerModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.sass'
})
export class HomeComponent {

    constructor() { }
}