import { Component } from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import { AdminRegisterComponent } from '../../shared/administration/admin-register/admin-register.component';
import { AllBooksComponent } from '../../shared/administration/all-books/all-books.component';
import { AllUsersComponent } from '../../shared/administration/all-users/all-users.component';

@Component({
    standalone: true,
    selector:  'app-adminpanel',
    imports: [MatExpansionModule, AdminRegisterComponent, AllBooksComponent, AllUsersComponent],
    templateUrl: './adminpanel.component.html',
    styleUrl: './adminpanel.component.sass'
})
export class AdminpanelComponent {

}
