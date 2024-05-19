import { Component, OnInit } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { RegisterRequest } from '../../../interfaces/askers/register-request';
import { RegisterService } from '../../../services/auth/register.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../modules/used-text-validator.module';
import { SessionService } from '../../../services/auth/session.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, FormsModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatSlideToggleModule,
        MatTooltipModule, NgxLoadingModule, SnackbarModule, customValidatorsModule, RouterLink
    ],
    templateUrl: './register.component.html',
    styleUrl: './register.component.sass',
})
export class RegisterComponent implements OnInit {
    names: string[] = [];
    isValid: boolean = false;
    passHide: boolean = true;

    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000',
    };

    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        this.customValidator.usedTextValidator(this.names)
    ]);
    email = new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(30),
    ]);
    password = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);

    errorNameMessage = '';
    errorEmailMessage = '';
    errorPassMessage = '';

    fgRegister = this.fBuild.group({
        name: this.name,
        email: this.email,
        password: this.password,
    });

    constructor(
        private fBuild: FormBuilder,
        private registerSrv: RegisterService,
        private _snackBar: SnackbarModule,
        private router: Router,
        private customValidator: customValidatorsModule,
        private sessionSrv: SessionService
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.password.statusChanges, this.password.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
    }

    ngOnInit(): void {
        this.sessionSrv.getAllUserNames().subscribe(names => {
            if (!names)
                names = [];
            this.names = names.map(a => a.toLocaleLowerCase());
            this.name = new FormControl('', [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(30),
                this.customValidator.usedTextValidator(this.names)
            ]);
            this.fgRegister = this.fBuild.group({
                name: this.name,
                email: this.email,
                password: this.password,
            });
        });
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Nombre de usuario no disponible';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateEmailErrorMessage() {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacío';
        else if (this.email.hasError('maxlength'))
            this.errorEmailMessage = 'Email demasiado largo';
        else this.errorEmailMessage = 'Email no válido';
    }

    updatePassErrorMessage() {
        if (this.password.hasError('required'))
            this.errorPassMessage = 'La contraseña no puede quedar vacía';
        else if (this.password.hasError('minlength'))
            this.errorPassMessage = 'Contraseña demasiado corta';
        else if (this.password.hasError('maxlength'))
            this.errorPassMessage = 'Contraseña demasiado larga';
        else this.errorPassMessage = 'Contraseña no válida';
    }

    doRegister() {
        if (this.fgRegister.invalid) {
            this._snackBar.openSnackBar('Error de credenciales' + this.fgRegister.errors, 'errorBar');
            return;
        }
        if (this.waitingServerResponse) return;
        this.waitingServerResponse = true;
        var res = false;
        this.registerSrv
            .register(this.fgRegister.value as RegisterRequest)
            .subscribe({
                next: () => {
                    res = true;
                    this.fgRegister.reset();
                    this.router.navigateByUrl('/login?registrationSuccess=true');
                },
                error: (error) => {
                    res = true;
                    this._snackBar.openSnackBar('Hubo un error al crear el usuario', 'errorBar');
                    this.waitingServerResponse = false;
                },
                complete: () => {
                    if (!res) this._snackBar.openSnackBar('No hubo respuesta del servidor', 'errorBar');
                    this.waitingServerResponse = false;
                },
            });
    }
}
