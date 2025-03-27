import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../services/auth/session.service';
import { LoginRequest } from '../../../interfaces/askers/login-request';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { UniverseService } from '../../../services/entities/universe.service';
import { UniverseStoreService } from '../../../services/stores/universe-store.service';
import { AuthorService } from '../../../services/entities/author.service';
import { AuthorStoreService } from '../../../services/stores/author-store.service';

@Component({
    standalone: true,
    selector:  'app-login',
    imports: [MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, FormsModule, ReactiveFormsModule, SnackbarModule,
        MatCardModule, MatButtonModule, RouterLink, MatTooltipModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.sass'
})
export class LoginComponent implements OnInit {
    isValid: boolean = false;
    passHide: boolean = true;

    email = new FormControl('', [Validators.required, Validators.email]);
    contrasena = new FormControl('', [Validators.required]);

    errorEmailMessage = '';
    errorPassMessage = '';

    fgLogin = this.fBuild.group({
        email: this.email,
        password: this.contrasena
    })

    constructor(private fBuild: FormBuilder, private router: Router, private sessionSrv: SessionService, private authorSrv: AuthorService, private snackBar: SnackbarModule, private route: ActivatedRoute,
        private loader: LoaderEmmitterService, private universeSrv: UniverseService, private universeStore: UniverseStoreService, private authorStore: AuthorStoreService) {
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.contrasena.statusChanges, this.contrasena.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            const registrationSuccess = params['registrationSuccess'];
            if (registrationSuccess === 'true')
                this.snackBar.openSnackBar('Registro exitoso. Por favor, inicie sesión.', 'successBar-margin');
        });
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
            this.snackBar.openSnackBar('Error de credenciales', 'errorBar');
            return;
        }
    
        this.loader.activateLoader();
    
        this.sessionSrv.login(this.fgLogin.value as LoginRequest).subscribe({
            next: () => {
                forkJoin({
                    universes: this.universeSrv.getUniverses(),
                    authors: this.authorSrv.getAllAuthors()
                }).subscribe({
                    next: ({ universes, authors }) => {
                        this.universeStore.setUniverses(universes);
                        this.authorStore.setAuthors(authors);
                        this.router.navigateByUrl("/dashboard");
                        this.fgLogin.reset();
                        this.fgLogin.markAsUntouched();
                    },
                    error: () => {
                        this.snackBar.openSnackBar('Error al cargar los datos del usuario', 'errorBar');
                    },
                    complete: () => {
                        this.loader.deactivateLoader();
                    }
                });
            },
            error: (error) => {
                this.loader.deactivateLoader();
                const message = error?.message?.includes('inválido')
                    ? 'Los datos de inicio no coinciden con ninguna cuenta'
                    : 'Error inesperado al iniciar sesión';
                this.snackBar.openSnackBar(message, 'errorBar');
            }
        });
    }
}