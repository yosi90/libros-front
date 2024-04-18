import { Component } from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import { RegisterComponent } from '../register/register.component';
import { AdminRegisterComponent } from '../../shared/admin-register/admin-register.component';

@Component({
  selector: 'app-adminpanel',
  standalone: true,
  imports: [MatExpansionModule, AdminRegisterComponent],
  templateUrl: './adminpanel.component.html',
  styleUrl: './adminpanel.component.sass'
})
export class AdminpanelComponent {

}
