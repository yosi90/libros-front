import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    standalone: true,
    selector:  'app-footer',
    imports: [MatIconModule],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.sass'
})
export class FooterComponent {

}
