import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { User } from '../../../interfaces/user';
import { UserService } from '../../../services/user/user.service';
import { LoginService } from '../../../services/auth/login.service';
import { JwtInterceptorService } from '../../../services/auth/jwt-interceptor.service';
import { ErrorInterceptorService } from '../../../services/auth/error-interceptor.service';
import { Router } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dahsboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    CommonModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptorService,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptorService,
      multi: true,
    },
  ],
  templateUrl: './dahsboard.component.html',
  styleUrl: './dahsboard.component.sass',
})
export class DahsboardComponent implements OnInit {
  userData?: User;

  modName: boolean = false;
  errorNameMessage = '';
  modEmail: boolean = false;
  errorEmailMessage = '';

  name = new FormControl('', [
    Validators.required,
    Validators.pattern('^[a-zA-Z]{3,15}'),
    Validators.minLength(3),
    Validators.maxLength(15),
  ]);
  fgName = this.fBuild.group({
    name: this.name,
  });

  email = new FormControl('', [
    Validators.required,
    Validators.email,
    Validators.maxLength(30),
  ]);
  fgEmail = this.fBuild.group({
    email: this.email,
  });

  updateNameErrorMessage() {
    if (this.name.hasError('required'))
      this.errorNameMessage = 'El nombre no puede quedar vacio';
    else if (this.name.hasError('minlength'))
      this.errorNameMessage = 'Nombre demasiado corto';
    else if (this.name.hasError('maxlength'))
      this.errorNameMessage = 'Nombre demasiado largo';
    else this.errorNameMessage = 'Nombre no válido';
  }

  updateEmailErrorMessage() {
    if (this.email.hasError('required'))
      this.errorEmailMessage = 'El email no puede quedar vacio';
    else if (this.email.hasError('maxlength'))
      this.errorEmailMessage = 'Email demasiado largo';
    else this.errorEmailMessage = 'Email no válido';
  }

  constructor(
    private fBuild: FormBuilder,
    private loginSrv: LoginService,
    private userSrv: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const token = this.loginSrv.token;
    if (token != null && token != '') {
      try {
        this.userSrv.getUser(token).subscribe({
          next: (user) => {
            this.userData = user;
          },
          error: (errorData) => {
            throw Error(errorData);
          },
        });
      } catch {
        this.loginSrv.logout();
        this.router.navigateByUrl('/home');
      }
    }
  }

  invertModName(): void {
    this.modName = !this.modName;
    if (this.modName === true) this.name.setValue(this.userData?.name ?? '');
  }

  invertModEmail(): void {
    this.modEmail = !this.modEmail;
    if (this.modEmail === true) this.email.setValue(this.userData?.email ?? '');
  }
}
