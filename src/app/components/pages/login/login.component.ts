import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../services/auth/session.service';
import { LoginRequest } from '../../../interfaces/askers/login-request';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, FormsModule, ReactiveFormsModule, SnackbarModule,
        MatCardModule, MatButtonModule, NgxLoadingModule, RouterLink, MatTooltipModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.sass'
})
export class LoginComponent implements OnInit {
    isValid: boolean = false;
    passHide: boolean = true;
    email = new FormControl('', [Validators.required, Validators.email]);
    contrasena = new FormControl('', [Validators.required]);
    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000'
    };

    errorEmailMessage = '';
    errorPassMessage = '';

    fgLogin = this.fBuild.group({
        email: this.email,
        password: this.contrasena
    })

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            const registrationSuccess = params['registrationSuccess'];
            if (registrationSuccess === 'true')
                this.snackBar.openSnackBar('Registro exitoso. Por favor, inicie sesión.', 'successBar-margin');
        });
    }

    constructor(private fBuild: FormBuilder, private router: Router, private loginsrv: SessionService, private snackBar: SnackbarModule, private route: ActivatedRoute) {
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.contrasena.statusChanges, this.contrasena.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
    }

    updateEmailErrorMessage() {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacío';
        else
            this.errorEmailMessage = 'Email no válido';
    }

    updatePassErrorMessage() {
        if (this.contrasena.hasError('required'))
            this.errorPassMessage = 'La contraseña no puede quedar vacía';
        else
            this.errorPassMessage = 'Contraseña no válida';
    }

    doLogin() {
        if (this.fgLogin.invalid) {
            this.snackBar.openSnackBar('Error de credenciales' + this.fgLogin.errors, 'errorBar');
            return;
        }
        if (this.waitingServerResponse)
            return;
        this.waitingServerResponse = true;
        var res = false;
        this.loginsrv.login(this.fgLogin.value as LoginRequest).subscribe({
            next: () => {
                res = true;
                this.fgLogin.reset();
                this.fgLogin.markAsUntouched();
                this.router.navigateByUrl("/dashboard");
            },
            error: () => {
                res = true;
                this.snackBar.openSnackBar('Los datos de inicio no coinciden con ninguna cuenta', 'errorBar');
                this.waitingServerResponse = false;
            },
            complete: () => {
                if (!res)
                    this.snackBar.openSnackBar('No hubo respuesta del servidor', 'errorBar');
                this.waitingServerResponse = false;
            }
        });
    }
}