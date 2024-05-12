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
import { Author } from '../../../../interfaces/author';
import { MatSelectModule } from '@angular/material/select';
import { SnackbarModule } from '../../../../modules/snackbar.module';

@Component({
    selector: 'app-add-saga',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, NgxLoadingModule, 
        customValidatorsModule, MatAutocompleteModule, AsyncPipe, MatSelectModule, SnackbarModule],
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
    universes: Universe[] = [];
    filteredUniverses!: Observable<string[]>;
    authors: Author[] = [];

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
    author = new FormControl([], [
        Validators.required
    ]);

    constructor(private userSrv: UserService, private loginSrv: LoginService, private sagaSrv: SagaService, private router: Router, private fBuild: FormBuilder, 
        private _snackBar: SnackbarModule, private customValidator: customValidatorsModule, private authorSrv: AuthorService, private universeSrv: UniverseService) {
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
                    this.universes = universes;
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
                    this.authors = authors;
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
        return this.universes.map(u => u.name).filter(option => option.toLowerCase().includes(filterValue));
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Saga ya registrada';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateUniverseErrorMessage() {
        if (this.universe.hasError('required'))
            this.errorUniverseMessage = 'El universo no puede quedar vacío';
        else this.errorUniverseMessage = 'Universo no válido';
    }

    updateAuthorErrorMessage() {
        if (this.author.hasError('required'))
            this.errorAuthorMessage = 'El autor no puede quedar vacío';
        else this.errorAuthorMessage = 'Autor no válido';
    }

    addSaga(): void {
        if (this.fgSaga.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgSaga.errors, 'errorBar');
            return;
        }
        if(this.waitingServerResponse)
            return;
        this.waitingServerResponse = true;
        const token = this.loginSrv.token;
        let universeEnt = this.universes.find(u => u.name === this.universe.value);
        if (!universeEnt)
            return;
        let saga: Saga = {
            sagaId: 0,
            userId: 0,
            name: this.name.value ?? '',
            universe: universeEnt,
            universeId: universeEnt.universeId,
            authors: this.author.value ?? [],
        }
        this.sagaSrv.addSaga(saga, token).subscribe({
            next: () => {
                this.fgSaga.reset();
                this.router.navigateByUrl('/dashboard/books?sagaAdded=true');
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
            complete: () => {
                this.waitingServerResponse = false;
            }
        });
    }
}
