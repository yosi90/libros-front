import { Component } from '@angular/core';
import { AsyncPipe, NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { Observable } from 'rxjs';
import { ApiHealth, ApiHealthService } from '../../../services/other/api-health.service';

@Component({
    standalone: true,
    selector:  'app-home',
    imports: [AsyncPipe, NgClass, MatCardModule, RouterLink, MatDividerModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.sass'
})
export class HomeComponent {

    apiHealth$: Observable<ApiHealth>;

    constructor(private apiHealthSrv: ApiHealthService) {
        this.apiHealth$ = this.apiHealthSrv.check();
    }
}
