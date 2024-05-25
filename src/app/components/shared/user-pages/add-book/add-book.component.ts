import { Component, OnInit } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { MatTooltip } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, merge, Observable, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SessionService } from '../../../../services/auth/session.service';
import { BookService } from '../../../../services/entities/book.service';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { User } from '../../../../interfaces/user';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { Book } from '../../../../interfaces/book';
import { MatSelectModule } from '@angular/material/select';
import { BookStatus } from '../../../../interfaces/book-status';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { ReadStatus } from '../../../../interfaces/read-status';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    selector: 'app-add-book',
    standalone: true,
    imports: [MatCard, MatCardContent, NgxDropzoneModule, MatTooltip, CommonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, CommonModule, MatIconModule, 
        MatInputModule, MatButtonModule, MatAutocompleteModule, MatSelectModule, customValidatorsModule, SnackbarModule],
    templateUrl: './add-book.component.html',
    styleUrl: './add-book.component.sass'
})
export class AddBookComponent implements OnInit {
    userData: User = {
        userId: -1,
        name: '',
        email: '',
        image: '',
        authors: [],
        universes: [],
        sagas: []
    };
    files: File[] = [];
    names: string[] = [];
    filteredUniverses!: Observable<string[]>;
    idUniversoActual = 1;
    filteredSagas!: Observable<string[]>;
    orders: number[] = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    statuses: BookStatus[] = [];
    actualStatus = 'Por comprar';

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
    author = new FormControl(this.userData.authors, [
        Validators.required
    ]);
    errorStatusMessage = '';
    status = new FormControl('', [
        Validators.required
    ]);

    constructor(private sessionSrv: SessionService, private bookSrv: BookService, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private router: Router, private customValidator: customValidatorsModule,
        private loader: LoaderEmmitterService) {
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
        this.loader.activateLoader();
        this.sessionSrv.user.subscribe({
            next: (user) => {
                this.userData = user;
                if (user.books) {
                    this.names = user.books.map(a => a.name.toLocaleLowerCase());
                    this.name = new FormControl('', [
                        Validators.required,
                        Validators.minLength(3),
                        Validators.maxLength(50),
                        this.customValidator.usedTextValidator(this.names)
                    ]);
                    this.fgBook = this.fBuild.group({
                        name: this.name,
                        universe: this.universe,
                        saga: this.saga,
                        order: this.order,
                        author: this.author,
                        status: this.status,
                    });
                }
                this.filteredUniverses = this.universe.valueChanges.pipe(
                    startWith(''),
                    map(value => this._universeFilter(value || '')),
                );
                this.universe.setValue(this.userData.universes[0].name);
                this.filteredSagas = this.saga.valueChanges.pipe(
                    startWith(''),
                    map(value => this._sagaFilter(value || '')),
                );
                this.saga.setValue(this.userData.sagas[0].name);
                this.bookSrv.getAllBookStatuses().subscribe({
                    next: (statuses) => {
                        this.statuses = statuses;
                        this.actualStatus = statuses[0].name;
                        this.loader.deactivateLoader();
                    },
                    error: () => {
                        this.sessionSrv.logout();
                    },
                });

            }
        });
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
        this.idUniversoActual = this.userData.universes.find(u => u.name == universe)?.universeId ?? 1;
        this.saga.setValue('');
        this.saga.setValue(this._sagaFilter('')[0]);

    }

    resetOrder(saga: string): void {
        if (saga && saga !== '' && saga !== this.userData.sagas[0].name)
            this.defaultOrder = 1;
        else
            this.defaultOrder = -1;
    }

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.userData.universes.map(u => u.name).filter(option => option.toLowerCase().includes(filterValue));
    }

    private _sagaFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.userData.sagas.filter(s => s.universeId === this.idUniversoActual).map(s => s.name).filter(option => option.toLowerCase().includes(filterValue));
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
        if (this.fgBook.invalid || this.files.length === 0) {
            this._snackBar.openSnackBar('Error de campos, faltan campos por rellenar', 'errorBar');
            return;
        }
        this.loader.activateLoader();
        let universeEnt = this.userData.universes.find(u => u.name === this.universe.value);
        if (!universeEnt)
            return;
        let sagaEnt = this.userData.sagas.find(s => s.name === this.saga.value);
        if (!sagaEnt)
            return;
        let statusEnt = this.statuses.find(s => s.name === this.status.value);
        let statusList: ReadStatus[] = [];
        if (!statusEnt)
            return;
        let readStatus: ReadStatus = {
            readStatusId: 0,
            status: statusEnt,
            date: ''
        }
        statusList.push(readStatus); 
        let book: Book = {
            bookId: 0,
            userId: 0,
            cover: '',
            status: statusList,
            name: this.name.value ?? '',
            universeId: universeEnt.universeId,
            universe: universeEnt,
            sagaId: sagaEnt.sagaId,
            saga: sagaEnt,
            orderInSaga: this.order.value ?? -1,
            authors: this.author.value ?? [],
            chapters: [],
            characters: []
        }
        this.bookSrv.addBook(book, this.files[0]).subscribe({
            next: (book) => {
                this.userData.books?.push(book);
                this.fillAuthorsBooks(book);
                this.fillUniverseBooks(book);
                this.fillSagasBooks(book);
                this.sessionSrv.updateUserData(this.userData);
                this.fgBook.reset();
                this.router.navigateByUrl('/dashboard/books?bookAdded=true');
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

    fillAuthorsBooks(book: Book): void {
        const sagaAuthorsIds = book.authors.map(a => a.authorId);
        this.userData.authors.forEach(author => {
            if (sagaAuthorsIds.includes(author.authorId)) {
                if (!author.books)
                    author.books = [];
                author.books.push(book);
            }
        });
    }

    fillUniverseBooks(book: Book): void {
        this.userData.universes.forEach(universe => {
            if (book.universeId === universe.universeId) {
                if (!universe.books)
                    universe.books = [];
                if (!universe.bookIds)
                    universe.bookIds = [];
                universe.books.push(book);
                universe.bookIds.push(book.bookId);
            }
        });
    }

    fillSagasBooks(book: Book): void {
        this.userData.sagas.forEach(saga => {
            if (book.sagaId === saga.sagaId) {
                if (!saga.books)
                    saga.books = [];
                if (!saga.bookIds)
                    saga.bookIds = [];
                saga.books.push(book);
                saga.bookIds.push(book.bookId);
            }
        });
    }
}