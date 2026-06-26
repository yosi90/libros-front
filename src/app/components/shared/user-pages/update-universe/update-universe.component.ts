import { CommonModule } from '@angular/common';
import { Component, Injector, OnDestroy, OnInit, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, merge, of, Subject, switchMap, tap } from 'rxjs';
import { Universe, UniverseWrite } from '../../../../interfaces/universe';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { UniverseService } from '../../../../services/entities/universe.service';
import { Author } from '../../../../interfaces/author';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';

@Component({
    standalone: true,
    selector:  'app-update-universe',
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule, MatSelectModule, SnackbarModule],
    templateUrl: './update-universe.component.html',
    styleUrl: './update-universe.component.sass'
})
export class UpdateUniverseComponent implements OnInit, OnDestroy {
    errorNameMessage = '';
    errorAuthorMessage = '';

    originalAuthors: number[] = [];
    originalUniverse: Universe = {
        Id: 0,
        Nombre: '',
        Autores: [],
        Sagas: [],
        Libros: [],
        Antologias: []
    };
    actualName: string = '';
    authors: Author[] = [];

    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ]);

    author = new FormControl<number[]>([], [
        Validators.required
    ]);

    fgUniverse = this.fBuild.group({
        name: this.name,
        author: this.author
    });

    private destroy$ = new Subject<void>();

    constructor(
        private universeSrv: UniverseService,
        private universeStore: UniverseStoreService,
        private authorStore: AuthorStoreService,
        private router: Router,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private loader: LoaderEmmitterService,
        private route: ActivatedRoute,
        private injector: Injector
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
    }

    ngOnInit(): void {
        this.route.params.pipe(
            switchMap(params => {
                const authors = this.authorStore.getAuthors();
                this.authors = authors;
                const universeId = Number(params['id']);
                const storedUniverse = this.universeStore.getUniverseById(universeId);

                return storedUniverse.Id > 0
                    ? of(storedUniverse)
                    : this.universeSrv.getUniverse(universeId);
            }),
            tap(universe => {
                this.originalAuthors = universe.Autores?.map(a => a.Id) || [];
                this.originalUniverse = universe;
                this.actualName = universe.Nombre;
                this.name.setValue(universe.Nombre);
                if (universe.Autores && universe.Autores.length) {
                    this.author.setValue(universe.Autores.map(a => a.Id));
                }
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

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Universo ya registrado';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateAuthorErrorMessage() {
        if (this.author.hasError('required'))
            this.errorAuthorMessage = 'El universo debe tener al menos un autor';
        else this.errorAuthorMessage = 'Autor no válido';
    }

    updateUniverse(): void {
        if (this.fgUniverse.invalid || !this.name.value) {
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

        const newUniverse: UniverseWrite = {
            Id: this.originalUniverse.Id,
            Nombre: this.name.value,
            Autores: selectedAuthorIds.map(Id => ({ Id }))
        };

        this.universeSrv.updateUniverse(newUniverse).pipe(
            switchMap(() => this.universeSrv.getUniverses())
        ).subscribe({
            next: (universes) => {
                this.universeStore.setUniverses(universes);
            },
            error: (errorData) => {
                const msg = getApiErrorMessage(errorData, 'Error al actualizar el universo');
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
                this.router.navigateByUrl('/dashboard/books?universeUpdated=true');
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
        const isNameSame = currentName === this.originalUniverse.Nombre;
        const isAuthorsSame = this.areArraysEqual(currentAuthors, this.originalAuthors);
        return isNameSame && isAuthorsSame;
    }
}
