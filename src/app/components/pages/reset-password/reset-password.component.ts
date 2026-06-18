import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { PasswordResetService } from '../../../services/auth/password-reset.service';
import { SnackbarModule } from '../../../modules/snackbar.module';

@Component({
    standalone: true,
    selector: 'app-reset-password',
    imports: [FormsModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, SnackbarModule],
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.sass'
})
export class ResetPasswordComponent implements OnInit {
    passHide = true;
    passRepeatHide = true;
    token = '';
    private readonly passwordSpecialChars = '@$!%*?&#ñÑ_';

    password = new FormControl('', [
        Validators.required,
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ_])[A-Za-z\\d@$!%*?&#ñÑ_]{8,}$'),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);
    passwordRepeat = new FormControl('', [Validators.required]);

    errorPassMessage = '';
    errorPassRepeatMessage = '';

    fgResetPassword = this.fBuild.group({
        password: this.password,
        passwordRepeat: this.passwordRepeat
    });

    constructor(
        private fBuild: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private passwordResetSrv: PasswordResetService,
        private snackBar: SnackbarModule,
        private loader: LoaderEmmitterService
    ) {
        merge(this.password.statusChanges, this.password.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
        merge(this.passwordRepeat.statusChanges, this.passwordRepeat.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordRepeatErrorMessage());
    }

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
        if (!this.token)
            this.snackBar.openSnackBar('El enlace de recuperación no es válido', 'errorBar');
    }

    updatePassErrorMessage(): void {
        if (this.password.hasError('required'))
            this.errorPassMessage = 'La contraseña no puede quedar vacía';
        else if (this.password.hasError('minlength'))
            this.errorPassMessage = 'La contraseña debe tener al menos 8 caracteres';
        else if (this.password.hasError('maxlength'))
            this.errorPassMessage = 'La contraseña no puede superar los 30 caracteres';
        else if (this.password.hasError('pattern')) {
            const missingRequirements = this.getMissingPasswordRequirements(this.password.value ?? '');
            this.errorPassMessage = missingRequirements.length
                ? `Debe incluir ${this.formatRequirementList(missingRequirements)}`
                : 'Contraseña no válida';
        } else this.errorPassMessage = '';

        this.updatePasswordRepeatErrorMessage();
    }

    updatePasswordRepeatErrorMessage(): void {
        if (this.passwordRepeat.hasError('required'))
            this.errorPassRepeatMessage = 'Repite la contraseña';
        else if (this.password.value !== this.passwordRepeat.value)
            this.errorPassRepeatMessage = 'Las contraseñas no coinciden';
        else this.errorPassRepeatMessage = '';
    }

    passwordsMatch(): boolean {
        return !!this.password.value && this.password.value === this.passwordRepeat.value;
    }

    confirmReset(): void {
        this.updatePassErrorMessage();
        this.updatePasswordRepeatErrorMessage();
        if (this.fgResetPassword.invalid || !this.passwordsMatch() || !this.token) {
            this.snackBar.openSnackBar('Revisa la nueva contraseña', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.passwordResetSrv.confirm(this.token, this.password.value ?? '')
            .pipe(finalize(() => this.loader.deactivateLoader()))
            .subscribe({
                next: () => {
                    this.snackBar.openSnackBar('Contraseña actualizada. Inicia sesión de nuevo.', 'successBar');
                    this.router.navigateByUrl('/login?passwordReset=true');
                },
                error: () => this.snackBar.openSnackBar('No se pudo actualizar la contraseña', 'errorBar')
            });
    }

    private getMissingPasswordRequirements(password: string): string[] {
        const missingRequirements: string[] = [];
        if (!/[a-z]/.test(password))
            missingRequirements.push('una minúscula');
        if (!/[A-Z]/.test(password))
            missingRequirements.push('una mayúscula');
        if (!/\d/.test(password))
            missingRequirements.push('un número');
        if (!/[@$!%*?&#ñÑ_]/.test(password))
            missingRequirements.push(`un símbolo (${this.passwordSpecialChars})`);
        return missingRequirements;
    }

    private formatRequirementList(requirements: string[]): string {
        if (requirements.length === 1)
            return requirements[0];
        if (requirements.length === 2)
            return `${requirements[0]} y ${requirements[1]}`;
        return `${requirements.slice(0, -1).join(', ')} y ${requirements[requirements.length - 1]}`;
    }
}
