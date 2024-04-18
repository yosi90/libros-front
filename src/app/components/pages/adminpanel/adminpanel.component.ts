import { Component } from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import { AdminRegisterComponent } from '../../shared/admin-register/admin-register.component';
import { AllBooksComponent } from '../../shared/all-books/all-books.component';
import { AllUsersComponent } from '../../shared/all-users/all-users.component';

@Component({
  selector: 'app-adminpanel',
  standalone: true,
  imports: [MatExpansionModule, AdminRegisterComponent, AllBooksComponent, AllUsersComponent],
  templateUrl: './adminpanel.component.html',
  styleUrl: './adminpanel.component.sass'
})
export class AdminpanelComponent {

}
