import { CommonModule, AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, merge, startWith, map } from 'rxjs';
import { Universe } from '../../../../interfaces/universe';
import { User } from '../../../../interfaces/user';
import { LoginService } from '../../../../services/auth/login.service';
import { AuthorService } from '../../../../services/entities/author.service';
import { UniverseService } from '../../../../services/entities/universe.service';
import { UserService } from '../../../../services/entities/user.service';
import { SagaService } from '../../../../services/entities/saga.service';
import { Saga } from '../../../../interfaces/saga';
import { NewSaga } from '../../../../interfaces/templates/new-saga';

@Component({
    selector: 'app-add-saga',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, NgxLoadingModule, customValidatorsModule, MatAutocompleteModule, AsyncPipe],
    templateUrl: './add-saga.component.html',
    styleUrl: './add-saga.component.sass'
})
export class AddSagaComponent {
    userData: User = {
        userId: 0,
        name: '',
        email: ''
    }
    names: string[] = [];
    universes: string[] = [];
    filteredUniverses!: Observable<string[]>;
    authors: string[] = [];
    filteredAuthors!: Observable<string[]>;

    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000',
    };

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        this.customValidator.usedTextValidator(this.names)
    ]);
    errorUniverseMessage = '';
    universe = new FormControl('', [
        Validators.required
    ]);
    errorAuthorMessage = '';
    author = new FormControl('', [
        Validators.required
    ]);

    constructor(private userSrv: UserService, private loginSrv: LoginService, private sagaSrv: SagaService, private router: Router, private fBuild: FormBuilder, private _snackBar: MatSnackBar, private customValidator: customValidatorsModule, private authorSrv: AuthorService, private universeSrv: UniverseService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.universe.statusChanges, this.universe.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateUniverseErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
    }

    ngOnInit(): void {
        const token = this.loginSrv.token;
        if (token != null && token != '') {
            this.userSrv.getUser(token).subscribe({
                next: async (user) => {
                    this.userData = user;
                    if (user.sagas) {
                        this.names = user.sagas.map(a => a.name.toLocaleLowerCase());
                        this.name = new FormControl('', [
                            Validators.required,
                            Validators.minLength(3),
                            Validators.maxLength(50),
                            this.customValidator.usedTextValidator(this.names)
                        ]);
                        this.fgSaga = this.fBuild.group({
                            name: this.name,
                            universe: this.universe,
                            author: this.author
                        });
                    }
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
            this.universeSrv.getAllUserUniverses(token).subscribe({
                next: (universes) => {
                    this.universes = universes.map(u => u.name);
                    this.filteredUniverses = this.universe.valueChanges.pipe(
                        startWith(''),
                        map(value => this._universeFilter(value || '')),
                    );
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
            this.authorSrv.getAllUserAuthors(token).subscribe({
                next: (authors) => {
                    this.authors = authors.map(a => a.name);
                    this.filteredAuthors = this.author.valueChanges.pipe(
                        startWith(''),
                        map(value => this._authorFilter(value || '')),
                    );
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
        }
    }

    fgSaga = this.fBuild.group({
        name: this.name,
        universe: this.universe,
        author: this.author
    });

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.universes.filter(option => option.toLowerCase().includes(filterValue));
    }

    private _authorFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.authors.filter(option => option.toLowerCase().includes(filterValue));
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacio';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Universo ya registrado';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateUniverseErrorMessage() {
        if (this.universe.hasError('required'))
            this.errorNameMessage = 'El universo no puede quedar vacio';
        else this.errorNameMessage = 'Universo no válido';
    }

    updateAuthorErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El autor no puede quedar vacio';
        else this.errorNameMessage = 'Autor no válido';
    }

    addSaga(): void {
        if (this.fgSaga.invalid) {
            this.openSnackBar('Error: ' + this.fgSaga.errors, 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.sagaSrv.addSaga(this.fgSaga.value as NewSaga, token).subscribe({
            next: () => {
                this.fgSaga.reset();
                this.router.navigateByUrl('/dashboard/books?universeAdded=true');
            },
            error: (errorData) => {
                this.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    openSnackBar(errorString: string, cssClass: string) {
        this._snackBar.open(errorString, 'Ok', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
            duration: 5000,
            panelClass: [cssClass],
        });
    }
    horizontalPosition: MatSnackBarHorizontalPosition = 'center';
    verticalPosition: MatSnackBarVerticalPosition = 'top';
}
