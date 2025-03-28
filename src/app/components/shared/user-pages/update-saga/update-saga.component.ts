import { CommonModule, AsyncPipe } from '@angular/common';
import { Component, Injector, OnDestroy, OnInit, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, merge, startWith, map, Subject, switchMap, tap, filter } from 'rxjs';
import { Saga } from '../../../../interfaces/saga';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { SagaService } from '../../../../services/entities/saga.service';
import { Universe } from '../../../../interfaces/universe';
import { Author } from '../../../../interfaces/author';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { NewSaga } from '../../../../interfaces/creation/newSaga';
import { UniverseService } from '../../../../services/entities/universe.service';
import { SessionService } from '../../../../services/auth/session.service';

@Component({
    standalone: true,
    selector:  'app-update-saga',
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule,
        MatAutocompleteModule, AsyncPipe, MatSelectModule, SnackbarModule],
    templateUrl: './update-saga.component.html',
    styleUrl: './update-saga.component.sass'
})
export class UpdateSagaComponent implements OnInit, OnDestroy {
    errorNameMessage = '';
    errorUniverseMessage = '';
    errorAuthorMessage = '';

    universes: Universe[] = [];
    universoActual!: Universe;
    authors: Author[] = [];

    filteredUniverses!: Observable<string[]>;

    originalAuthors: number[] = [];
    originalUniverse!: Universe;
    originalSaga!: Saga;
    actualName: string = '';

    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ]);
    universe = new FormControl('', [
        Validators.required
    ]);
    author = new FormControl<number[]>([], [
        Validators.required
    ]);

    private destroy$ = new Subject<void>();

    constructor(
        private sessionSrv: SessionService,
        private sagaSrv: SagaService,
        private router: Router,
        private fBuild: FormBuilder,
        private loader: LoaderEmmitterService,
        private _snackBar: SnackbarModule,
        private route: ActivatedRoute,
        private universeSrv: UniverseService,
        private universeStore: UniverseStoreService,
        private authorStore: AuthorStoreService,
        private injector: Injector
    ) {
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
        this.route.params.pipe(
            tap(params => {
                const authors = this.authorStore.getAuthors();
                this.authors = authors;
                const saga = this.universeStore.getSagaById(params['id'])
                const universe = this.universeStore.getUniverseOfSaga(params['id']);
                if (!universe)
                    return;
                this.originalSaga = saga;
                this.originalAuthors = saga.Autores?.map(a => a.Id) || [];
                this.originalUniverse = universe;
                this.actualName = saga.Nombre;
                this.name.setValue(saga.Nombre);
                if (saga.Autores && saga.Autores.length) {
                    this.author.setValue(saga.Autores.map(a => a.Id));
                }
                this.filteredUniverses = this.universe.valueChanges.pipe(
                    startWith(''),
                    map(value => this._universeFilter(value || '')),
                );
                this.universe.setValue(universe.Nombre);
            }),
            switchMap(() =>
                runInInjectionContext(this.injector, () =>
                    this.name.valueChanges.pipe(
                        filter(nameValue => !!nameValue),
                        takeUntilDestroyed()
                    )
                )
            )
        ).subscribe(nameValue => {
            this.actualName = nameValue ?? '';
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    fgSaga = this.fBuild.group({
        name: this.name,
        universe: this.universe,
        author: this.author
    });

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.universes.map(u => u.Nombre).filter(option => option.toLowerCase().includes(filterValue));
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
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
        if(this.sessionSrv.userRole.Nombre !== 'administrador' || this.sessionSrv.userRole.Id !== 2){
            this._snackBar.openSnackBar('Lamentablemente esta web es solo de muestra, los usuarios no pueden guardar/modificar datos por el momento', 'errorBar', 6000);
            return;
        }
        if (this.fgSaga.invalid || !this.name.value) {
            this._snackBar.openSnackBar('Error: datos no válidos', 'errorBar');
            return;
        }

        this.loader.activateLoader();

        const selectedAuthorIds = this.author.value as number[] | null;
        if (!selectedAuthorIds || selectedAuthorIds.length === 0) {
            this._snackBar.openSnackBar('Selecciona al menos un autor', 'errorBar');
            this.loader.deactivateLoader();
            return;
        }
        const selectedAuthors = this.authors.filter(a => selectedAuthorIds.includes(a.Id));

        const universeName = this.universe.value;
        if (!universeName) {
            this._snackBar.openSnackBar('Selecciona un universo', 'errorBar');
            this.loader.deactivateLoader();
            return;
        }
        const universe = this.universeStore.getUniverse(universeName);
        if (!universe) {
            this._snackBar.openSnackBar('Selecciona un universo', 'errorBar');
            return;
        }

        const newsaga: NewSaga = {
            Id: this.originalSaga.Id,
            Nombre: this.name.value,
            Autores: selectedAuthors,
            Universo: universe,
            UserId: 0
        };

        this.sagaSrv.updateSaga(newsaga).pipe(
            switchMap(() => this.universeSrv.getUniverses())
        ).subscribe({
            next: (universes) => {
                this.universeStore.setUniverses(universes);
            },
            error: (errorData) => {
                const msg = errorData?.error.error || 'Error al actualizar la saga';
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
                this.router.navigateByUrl('/dashboard/books?sagaUpdated=true');
            }
        });
    }

    private areArraysEqual(arr1: number[], arr2: number[]): boolean {
        if (arr1.length !== arr2.length) {
            return false;
        }
        const sorted1 = [...arr1].sort();
        const sorted2 = [...arr2].sort();
        return sorted1.every((value, index) => value === sorted2[index]);
    }

    hasChanged(): boolean {
        const currentName = this.name.value;
        const currentAuthors: number[] = this.author.value || [];
        const currentUniverse: String | null = this.universe.value;
        const isNameSame = currentName === this.originalSaga.Nombre;
        const isAuthorsSame = this.areArraysEqual(currentAuthors, this.originalAuthors);
        const isUniverseSame = currentUniverse === this.originalUniverse.Nombre;
        return isNameSame && isAuthorsSame && isUniverseSame;
    }
}
