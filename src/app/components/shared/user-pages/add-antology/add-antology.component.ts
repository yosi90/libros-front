import { Component, Injector, OnInit, runInInjectionContext } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, map, merge, Observable, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { MatSelectModule } from '@angular/material/select';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { ReadStatus } from '../../../../interfaces/read-status';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { Universe } from '../../../../interfaces/universe';
import { Author } from '../../../../interfaces/author';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { Saga } from '../../../../interfaces/saga';
import { NewBook } from '../../../../interfaces/creation/newBook';
import { AntologyService } from '../../../../services/entities/antology.service';

@Component({
    selector: 'app-add-antology',
    standalone: true,
    imports: [MatCard, NgxDropzoneModule, CommonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, CommonModule, MatIconModule,
        MatInputModule, MatButtonModule, MatAutocompleteModule, MatSelectModule, customValidatorsModule, SnackbarModule],
    templateUrl: './add-antology.component.html',
    styleUrl: './add-antology.component.sass'
})
export class AddAntologyComponent implements OnInit {
    sinSaga: Saga = {
        Id: 0,
        Nombre: 'Sin saga',
        Autores: [],
        Libros: [],
        Antologias: []
    };
    universes: Universe[] = [];
    sagas: Saga[] = [...[], this.sinSaga];
    authors: Author[] = [];

    bookstatus: ReadStatus[] = [
        {
            Id: 0,
            Nombre: 'En espera',
            Fecha: ''
        },
        {
            Id: 1,
            Nombre: 'En marcha',
            Fecha: ''
        },
        {
            Id: 2,
            Nombre: 'Leído',
            Fecha: ''
        },
        {
            Id: 3,
            Nombre: 'Por comprar',
            Fecha: ''
        },
    ]

    files: File[] = [];
    names: string[] = [];
    filteredUniverses!: Observable<string[]>;
    idUniversoActual = 1;
    filteredSagas!: Observable<string[]>;
    orders: number[] = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    actualStatus = 'Por comprar';

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ]);
    errorUniverseMessage = '';
    universe = new FormControl('', [
        Validators.required
    ]);
    errorSagaMessage = '';
    saga = new FormControl('', [
        Validators.required
    ]);
    defaultOrder: number = -1;
    errorOrderMessage = '';
    order = new FormControl(-1, [
        Validators.required
    ]);
    errorAuthorMessage = '';
    author = new FormControl(this.authors, [
        Validators.required
    ]);
    errorStatusMessage = '';
    status = new FormControl('', [
        Validators.required
    ]);

    constructor(private antologySrv: AntologyService, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private router: Router, private injector: Injector,
        private loader: LoaderEmmitterService, private universeStore: UniverseStoreService, private authorStore: AuthorStoreService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.universe.statusChanges, this.universe.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateUniverseErrorMessage());
        merge(this.saga.statusChanges, this.saga.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateSagaErrorMessage());
        merge(this.order.statusChanges, this.order.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateOrderErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
        merge(this.status.statusChanges, this.status.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateStatusErrorMessage());
    }

    ngOnInit(): void {
        this.universes = this.universeStore.getUniverses();
        this.sagas = [this.sinSaga, ... this.universeStore.getAllSagas()];
        this.authors = this.authorStore.getAuthors();
        this.filteredUniverses = this.universe.valueChanges.pipe(
            startWith(''),
            map(value => this._universeFilter(value || '')),
        );
        this.universe.setValue(this.universes[0].Nombre);
        this.filteredSagas = this.saga.valueChanges.pipe(
            startWith(''),
            map(value => this._sagaFilter(value || '')),
        );
        this.saga.setValue(this.sagas[0].Nombre);
        this.status.setValue(this.actualStatus);

        runInInjectionContext(this.injector, () => {
            this.saga.valueChanges.pipe(
                filter(sagaValue => sagaValue != null && sagaValue !== ''),
                takeUntilDestroyed()
            ).subscribe(sagaValue => {
                this.resetOrder(sagaValue);
                this.order.setValue(this.defaultOrder);
            });
        });
    }

    fgAntology = this.fBuild.group({
        name: this.name,
        universe: this.universe,
        saga: this.saga,
        order: this.order,
        author: this.author,
        status: this.status,
    });

    onSelect(event: { addedFiles: any; }): void {
        this.files = [];
        this.files.push(event.addedFiles[0]);
    }

    onRemove(): void {
        this.files = [];
    }

    updateDisplayedSagas(universe: string): void {
        this.idUniversoActual = this.universes.find(u => u.Nombre == universe)?.Id ?? 1;
        this.saga.setValue('');
        this.saga.setValue(this._sagaFilter('')[0]);
    }

    resetOrder(saga: string | null): void {
        if (saga && saga !== '' && saga !== 'Sin saga')
            this.defaultOrder = 1;
        else
            this.defaultOrder = -1;
    }

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.universes.map(u => u.Nombre).filter(option => option.toLowerCase().includes(filterValue));
    }

    private _sagaFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.sagas.filter(s => this.universeStore.getUniverseOfSaga(s.Id)?.Id === this.idUniversoActual || s.Id === 0).map(s => s.Nombre).filter(option => option.toLowerCase().includes(filterValue));
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

    updateSagaErrorMessage() {
        if (this.saga.hasError('required'))
            this.errorSagaMessage = 'La saga no puede quedar vacía';
        else this.errorSagaMessage = 'Saga no válida';
    }

    updateOrderErrorMessage() {
        if (this.order.hasError('required'))
            this.errorOrderMessage = 'El orden no puede quedar vacío';
        else this.errorOrderMessage = 'Orden no válido';
    }

    updateAuthorErrorMessage() {
        if (this.author.hasError('required'))
            this.errorAuthorMessage = 'El autor no puede quedar vacío';
        else this.errorAuthorMessage = 'Autor no válido';
    }

    updateStatusErrorMessage() {
        if (this.status.hasError('required'))
            this.errorStatusMessage = 'El estado no puede quedar vacío';
        else this.errorStatusMessage = 'Estado no válido';
    }

    addAntology(): void {
        if (this.fgAntology.invalid || this.files.length === 0) {
            this._snackBar.openSnackBar('Error de campos, faltan campos por rellenar', 'errorBar');
            return;
        }
        this.loader.activateLoader();

        const universeName = this.universe.value;
        if (!universeName) {
            this._snackBar.openSnackBar('Selecciona un universo', 'errorBar');
            this.loader.deactivateLoader();
            return;
        }
        const universeEnt = this.universeStore.getUniverse(universeName);
        if (!universeEnt) {
            this._snackBar.openSnackBar('Selecciona un universo', 'errorBar');
            return;
        }
        const sagaName = this.saga.value;
        if (!sagaName) {
            this._snackBar.openSnackBar('Selecciona una saga', 'errorBar');
            this.loader.deactivateLoader();
            return;
        }
        var sagaEnt: Saga | undefined;
        if (sagaName !== 'Sin saga') {
            sagaEnt = this.universeStore.getSaga(sagaName);
            if (!sagaEnt) {
                this._snackBar.openSnackBar('Selecciona una saga', 'errorBar');
                this.loader.deactivateLoader();
                return;
            }
        } else
            sagaEnt = this.sinSaga;
        let estado = this.bookstatus.find(s => s.Nombre === this.status.value);
        if (!estado)
            return;
        let readStatus: ReadStatus = {
            Id: estado.Id,
            Nombre: estado.Nombre,
            Fecha: new Date().toISOString()
        }

        let newBook: NewBook = {
            Id: 0,
            Nombre: this.name.value ?? '',
            Autores: this.author.value ?? [],
            Universo: universeEnt,
            Saga: sagaEnt,
            Orden: this.order.value ?? -1,
            Estado: readStatus,
            UserId: 0
        }

        this.antologySrv.addAntology(newBook, this.files[0]).subscribe({
            next: (createdBook) => {
                this.universeStore.addAntology(createdBook, universeEnt, sagaEnt ?? this.sinSaga);
                this.router.navigateByUrl('/dashboard/books?antologyAdded=true');
            },
            error: (errorData) => {
                const msg = errorData?.error.error || 'Error al crear la antología';
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }
}