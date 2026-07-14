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
import { UniverseStoreService } from '../../../services/stores/universe-store.service';
import { AuthorService } from '../../../services/entities/author.service';
import { AuthorStoreService } from '../../../services/stores/author-store.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage, getProductStateMessage } from '../../../shared/api-error-message';
import { CollectionService } from '../../../services/entities/collection.service';

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
    readingQuote: ReadingQuote = getRandomReadingQuote();

    email = new FormControl('', [Validators.required, Validators.email]);
    contrasena = new FormControl('', [Validators.required]);

    errorEmailMessage = '';
    errorPassMessage = '';

    fgLogin = this.fBuild.group({
        email: this.email,
        password: this.contrasena
    })

    constructor(private fBuild: FormBuilder, private router: Router, private sessionSrv: SessionService, private authorSrv: AuthorService, private snackBar: SnackbarModule, private route: ActivatedRoute,
        private loader: LoaderEmmitterService, private collectionSrv: CollectionService, private universeStore: UniverseStoreService, private authorStore: AuthorStoreService) {
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
                this.snackBar.openSnackBar('Registro creado. Revisa tu email para activar la cuenta.', 'successBar-margin');
            const passwordReset = params['passwordReset'];
            if (passwordReset === 'true')
                this.snackBar.openSnackBar('Contraseña actualizada. Por favor, inicie sesión.', 'successBar-margin');
            const resetRequested = params['resetRequested'];
            if (resetRequested === 'true')
                this.snackBar.openSnackBar('Si el correo existe, recibirás instrucciones para recuperar la contraseña.', 'successBar-margin');
            const emailVerified = params['emailVerified'];
            if (emailVerified === 'true') {
                this.snackBar.openSnackBar('Email verificado. Ya puedes iniciar sesión.', 'successBar-margin', 3000, {
                    title: 'Correo verificado',
                    dedupeKey: 'auth:email-verified'
                });
                void this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: { emailVerified: null },
                    queryParamsHandling: 'merge',
                    replaceUrl: true
                });
            }
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
    
        this.loader.activateLoader('login');
    
        this.sessionSrv.login(this.fgLogin.value as LoginRequest).subscribe({
            next: () => {
                if (!this.sessionSrv.canAccessLibrary) {
                    this.loader.deactivateLoader();
                    this.router.navigateByUrl('/verify-email-pending');
                    return;
                }

                forkJoin({
                    universes: this.collectionSrv.getUniverses(),
                    authors: this.authorSrv.getAllAuthors()
                }).subscribe({
                    next: ({ universes, authors }) => {
                        this.universeStore.setUniverses(universes);
                        this.authorStore.setAuthors(authors);
                        this.router.navigateByUrl("/dashboard");
                    },
                    error: (error) => {
                        this.abortLogin(error);
                    },
                    complete: () => {
                        this.loader.deactivateLoader();
                    }
                });
            },
            error: (error) => {
                this.loader.deactivateLoader();
                const message = getApiErrorMessage(error, 'Error inesperado al iniciar sesión');
                this.snackBar.openSnackBar(message, 'errorBar');
            }
        });
    }

    private abortLogin(error: unknown): void {
        const cause = getProductStateMessage(error, 'La API no ha permitido cargar tu biblioteca.');
        this.sessionSrv.logout(false);
        this.loader.deactivateLoader();
        this.snackBar.openSnackBar(`No se pudo completar el inicio de sesión. ${cause} Se ha cerrado la sesión.`, 'errorBar', 6000);
    }
}
