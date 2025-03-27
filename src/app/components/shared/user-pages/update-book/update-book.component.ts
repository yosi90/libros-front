import { CommonModule } from '@angular/common';
import { Component, Injector, OnDestroy, OnInit, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Observable, merge, Subject, tap, startWith, map, switchMap, filter } from 'rxjs';
import { BookSimple } from '../../../../interfaces/book';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { BookService } from '../../../../services/entities/book.service';
import { environment } from '../../../../../environment/environment';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { Author } from '../../../../interfaces/author';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { ReadStatus } from '../../../../interfaces/read-status';
import { NewBook } from '../../../../interfaces/creation/newBook';
import { UniverseService } from '../../../../services/entities/universe.service';

@Component({
    selector: 'app-update-book',
    standalone: true,
    imports: [MatCard, NgxDropzoneModule, CommonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, CommonModule, MatIconModule,
        MatInputModule, MatButtonModule, MatAutocompleteModule, MatSelectModule, customValidatorsModule, SnackbarModule],
    templateUrl: './update-book.component.html',
    styleUrl: './update-book.component.sass'
})
export class UpdateBookComponent implements OnInit, OnDestroy {
    imgUrl = environment.getImgUrl;

    errorNameMessage = '';
    errorUniverseMessage = '';
    errorSagaMessage = '';
    errorOrderMessage = '';
    errorAuthorMessage = '';
    errorStatusMessage = '';

    universes: Universe[] = [];
    originalUniverse!: Universe;
    universoActual!: Universe;
    sinSaga: Saga = {
        Id: 0,
        Nombre: 'Sin saga',
        Autores: [],
        Libros: [],
        Antologias: []
    };
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
    sagas: Saga[] = [...[], this.sinSaga];
    originalSaga!: Saga;
    sagaActual!: Saga;
    authors: Author[] = [];
    originalAuthors: number[] = [];
    originalBook!: BookSimple;
    actualName: string = '';
    originalOrder: number = -1;
    actualOrder: number = -1;
    originalStatus!: ReadStatus;
    actualStatus: string = '';
    originalCover: string = '';

    files: File[] = [];
    names: string[] = [];
    filteredUniverses!: Observable<string[]>;
    filteredSagas!: Observable<string[]>;
    orders: number[] = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ]);
    universe = new FormControl('', [
        Validators.required
    ]);
    saga = new FormControl('', [
        Validators.required
    ]);
    order = new FormControl(-1, [
        Validators.required
    ]);
    author = new FormControl<number[]>([], [
        Validators.required
    ]);
    status = new FormControl('', [
        Validators.required
    ]);

    private destroy$ = new Subject<void>();

    constructor(
        private bookSrv: BookService,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private router: Router,
        private route: ActivatedRoute,
        private loader: LoaderEmmitterService,
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
        this.route.params.pipe(
            tap(params => {
                const bookId = params['id'];
                this.universes = this.universeStore.getUniverses();
                this.sagas = [this.sinSaga, ... this.universeStore.getAllSagas()];
                this.authors = this.authorStore.getAuthors();
                const universe = this.universeStore.getUniverseOfBook(bookId);
                const saga = this.universeStore.getSagaOfBook(bookId) ?? this.sinSaga;
                const book = this.universeStore.getBookById(bookId);
                if (!universe)
                    return;
                this.originalUniverse = universe;
                this.universoActual = universe;
                this.originalBook = book;
                this.originalAuthors = book.Autores?.map(b => b.Id) || [];
                this.originalSaga = saga;
                this.originalOrder = book.Orden;
                this.actualOrder = this.originalOrder;
                this.originalStatus = book.Estados[book.Estados.length - 1];
                this.actualStatus = this.originalStatus.Nombre;
                this.actualName = book.Nombre;
                this.originalCover = book.Portada;
                this.name.setValue(book.Nombre);
                this.status.setValue(this.originalStatus.Nombre);
                this.order.setValue(this.originalOrder);
                if (book.Autores && book.Autores.length) {
                    this.author.setValue(book.Autores.map(a => a.Id));
                }
                this.filteredUniverses = this.universe.valueChanges.pipe(
                    startWith(''),
                    map(value => this._universeFilter(value || '')),
                );
                this.universe.setValue(universe.Nombre);
                this.filteredSagas = this.saga.valueChanges.pipe(
                    startWith(''),
                    map(value => this._sagaFilter(value || '')),
                );
                this.saga.setValue(saga.Nombre);
                this.bookSrv.getCover(book.Portada).subscribe({
                    next: (file: File) => this.files = [file],
                    error: () => this._snackBar.openSnackBar('Error al cargar portada', 'errorBar')
                });
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

    fgBook = this.fBuild.group({
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
        this.universoActual = this.universes.find(u => u.Nombre == universe) ?? this.originalUniverse;
        this.saga.setValue('');
        this.saga.setValue(this._sagaFilter('')[0]);
    }

    resetOrder(sagaNombre: string): void {
        if (this.originalBook && sagaNombre && sagaNombre !== '' && sagaNombre !== this.sagas[0].Nombre) {
            const saga = this.universeStore.getSaga(sagaNombre);
            if (!saga)
                return;
            const nextOrder = saga.Libros.length > 0 ? saga.Libros[saga.Libros.length - 1].Orden + 1 : 1;
            this.actualOrder = this.originalBook.Orden === -1 ? nextOrder : this.originalBook.Orden;
            this.order.setValue(this.actualOrder);
        } else {
            this.actualOrder = -1;
            this.order.setValue(this.actualOrder);
        }
    }

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.universes.map(u => u.Nombre).filter(option => option.toLowerCase().includes(filterValue));
    }

    private _sagaFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.sagas.filter(s => this.universeStore.getUniverseOfSaga(s.Id)?.Id === this.universoActual.Id || s.Id === 0).map(s => s.Nombre).filter(option => option.toLowerCase().includes(filterValue));
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

    addBook(): void {
        if (this.fgBook.invalid || !this.name.value) {
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

        const newBook: NewBook = {
            Id: this.originalBook.Id,
            Nombre: this.name.value,
            Autores: selectedAuthors,
            Universo: universeEnt,
            Saga: sagaEnt,
            Orden: this.order.value ?? -1,
            Estado: readStatus,
            UserId: 0
        };

        if (!this.files[0]) {
            this._snackBar.openSnackBar('Selecciona una portada', 'errorBar');
            this.loader.deactivateLoader();
            return;
        }

        this.bookSrv.updateBook(newBook, this.files[0]).pipe(
            switchMap(() => this.universeSrv.getUniverses())
        ).subscribe({
            next: (universes) => {
                this.universeStore.setUniverses(universes);
            },
            error: (errorData) => {
                const msg = errorData?.error.error || 'Error al actualizar el libro';
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
                this.router.navigateByUrl('/dashboard/books?bookUpdated=true');
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
        const currentSaga: String | null = this.saga.value;
        if (!this.files[0])
            return false;
        const currentCover: String | null = this.files[0].name;
        const currentStatus: ReadStatus | undefined = this.bookstatus.find(s => s.Nombre === this.status.value);
        const currentOrder: number | null = this.order.value;
        const isNameSame = currentName === this.originalBook.Nombre;
        const isAuthorsSame = this.areArraysEqual(currentAuthors, this.originalAuthors);
        const isUniverseSame = currentUniverse === this.originalUniverse.Nombre;
        const isSagaSame = currentSaga === this.originalSaga.Nombre;
        const isCoverSame = currentCover === this.originalCover;
        const isStatusSame = currentStatus?.Nombre == this.originalStatus.Nombre;
        const isOrderSame = currentOrder === this.originalOrder;
        return isNameSame && isAuthorsSame && isUniverseSame && isSagaSame && isCoverSame && isStatusSame && isOrderSame;
    }
}