import { CommonModule, AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, merge, startWith, map } from 'rxjs';
import { User } from '../../../../interfaces/user';
import { SessionService } from '../../../../services/auth/session.service';
import { AuthorService } from '../../../../services/entities/author.service';
import { UniverseService } from '../../../../services/entities/universe.service';
import { UserService } from '../../../../services/entities/user.service';
import { SagaService } from '../../../../services/entities/saga.service';
import { Saga } from '../../../../interfaces/saga';
import { MatSelectModule } from '@angular/material/select';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    selector: 'app-add-saga',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule, 
        MatAutocompleteModule, AsyncPipe, MatSelectModule, SnackbarModule],
    templateUrl: './add-saga.component.html',
    styleUrl: './add-saga.component.sass'
})
export class AddSagaComponent {
    userData!: User;
    names: string[] = [];
    filteredUniverses!: Observable<string[]>;

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

    constructor(private sessionSrv: SessionService, private sagaSrv: SagaService, private router: Router, private fBuild: FormBuilder, private loader: LoaderEmmitterService,
        private _snackBar: SnackbarModule, private customValidator: customValidatorsModule) {
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
        this.loader.activateLoader();
        this.sessionSrv.user.subscribe({
            next: (user) => {
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
                this.filteredUniverses = this.universe.valueChanges.pipe(
                    startWith(''),
                    map(value => this._universeFilter(value || '')),
                );
                this.universe.setValue(this.userData.universes[0].name);
                this.loader.deactivateLoader();
            }
        });
    }

    fgSaga = this.fBuild.group({
        name: this.name,
        universe: this.universe,
        author: this.author
    });

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.userData.universes.map(u => u.name).filter(option => option.toLowerCase().includes(filterValue));
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
        this.loader.activateLoader();
        const token = this.sessionSrv.token;
        let universeEnt = this.userData.universes.find(u => u.name === this.universe.value);
        if (!universeEnt)
            return;
        let saga: Saga = {
            sagaId: 0,
            userId: 0,
            name: this.name.value ?? '',
            universe: universeEnt,
            universeId: universeEnt.universeId,
            authorIds: [],
            authors: this.author.value ?? [],
            bookIds: []
        }
        this.sagaSrv.addSaga(saga, token).subscribe({
            next: (saga) => {
                this.userData.sagas?.push(saga);
                this.fillAuthorsSagas(saga);
                this.fillUniverseSagas(saga);
                this.sessionSrv.updateUserData(this.userData);
                this.fgSaga.reset();
                this.router.navigateByUrl('/dashboard/books?sagaAdded=true');
            },
            error: (errorData) => {
                this.loader.deactivateLoader();
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    fillAuthorsSagas(saga: Saga): void {
        const sagaAuthorsIds = saga.authors.map(a => a.authorId);
        this.userData.authors.forEach(author => {
            if (sagaAuthorsIds.includes(author.authorId)) {
                if (!author.sagas)
                    author.sagas = [];
                author.sagas.push(saga);
            }
        });
    }

    fillUniverseSagas(saga: Saga): void {
        this.userData.universes.forEach(universe => {
            if (saga.universeId === universe.universeId) {
                if (!universe.sagas)
                    universe.sagas = [];
                universe.sagas.push(saga);
            }
        });
    }
}
