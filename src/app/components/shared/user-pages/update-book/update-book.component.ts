import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Observable, merge, startWith, map, takeUntil, Subject, switchMap } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { BookStatus } from '../../../../interfaces/book-status';
import { User } from '../../../../interfaces/user';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { SessionService } from '../../../../services/auth/session.service';
import { BookService } from '../../../../services/entities/book.service';
import { environment } from '../../../../../environment/environment';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    selector: 'app-update-book',
    standalone: true,
    imports: [MatCard, MatCardContent, NgxDropzoneModule, MatTooltip, CommonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, CommonModule, MatIconModule,
        MatInputModule, MatButtonModule, MatAutocompleteModule, MatSelectModule, customValidatorsModule, SnackbarModule],
    templateUrl: './update-book.component.html',
    styleUrl: './update-book.component.sass'
})
export class UpdateBookComponent implements OnInit, OnDestroy {
    imgUrl = environment.apiUrl;
    userData: User = {
        userId: -1,
        name: '',
        email: '',
        image: '',
        authors: [],
        universes: [],
        sagas: []
    };
    originalBook!: Book;
    actualBook: Book = {
        bookId: 0,
        name: '',
        cover: '',
        userId: 0,
        status: [{
            readStatusId: 0,
            status: {
                statusId: 1,
                name: 'Por comprar'
            },
            date: ''
        }],
        authors: [],
        chapters: [],
        characters: [],
        universeId: 0,
        universe: {
            universeId: 0,
            name: '',
            authorIds: [],
            authors: [],
            userId: 0,
            sagaIds: [],
            sagas: [],
            bookIds: []
        },
        sagaId: 0,
        saga: {
            sagaId: 0,
            userId: 0,
            name: '',
            authorIds: [],
            authors: [],
            universeId: 0,
            universe: {
                universeId: 0,
                name: '',
                authorIds: [],
                authors: [],
                userId: 0,
                sagaIds: [],
                sagas: [],
                bookIds: []
            },
            bookIds: []
        },
        orderInSaga: -1
    };
    files: File[] = [];
    names: string[] = [];
    filteredUniverses!: Observable<string[]>;
    idUniversoActual = 1;
    filteredSagas!: Observable<string[]>;
    orders: number[] = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    statuses: BookStatus[] = [];
    authorNames: string[] = [];

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
    errorOrderMessage = '';
    order = new FormControl(-1, [
        Validators.required
    ]);
    errorAuthorMessage = '';
    author = new FormControl('', [
        Validators.required
    ]);
    errorStatusMessage = '';
    status = new FormControl('', [
        Validators.required
    ]);

    private destroy$ = new Subject<void>();

    constructor(private sessionSrv: SessionService, private bookSrv: BookService, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private router: Router,
        private customValidator: customValidatorsModule, private route: ActivatedRoute, private loader: LoaderEmmitterService) {
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
        this.route.params.pipe(
            switchMap(params => this.bookSrv.getCreatedBook(params['id']))
        ).subscribe(book => {
            if (!book) {
                this.sessionSrv.logout();
                return;
            }
            this.originalBook = book;
            this.actualBook = book;
            this.bookSrv.getCover(this.originalBook.cover).subscribe(
                (imageFile: File) => {
                    this.files.push(imageFile);
                }
            );
            this.authorNames = book.authors.map(a => a.name);
            this.sessionSrv.user.pipe(takeUntil(this.destroy$)).subscribe(user => {
                this.userData = user;
                if (user.books) {
                    this.names = user.books.map(a => a.name.toLowerCase());
                    this.name = new FormControl(this.actualBook.name, [
                        Validators.required,
                        Validators.minLength(3),
                        Validators.maxLength(50),
                        this.customValidator.usedTextValidator(this.names, this.originalBook.name)
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
                this.filteredSagas = this.saga.valueChanges.pipe(
                    startWith(''),
                    map(value => this._sagaFilter(value || '')),
                );
                this.bookSrv.getAllBookStatuses().subscribe({
                    next: (statuses) => {
                        this.statuses = statuses;
                        this.loader.deactivateLoader();
                    },
                    error: () => {
                        this.sessionSrv.logout();
                    },
                });
            });
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
        this.idUniversoActual = this.userData.universes.find(u => u.name == universe)?.universeId ?? 1;
        this.saga.setValue('');
        this.saga.setValue(this._sagaFilter('')[0]);

    }

    resetOrder(saga: string): void {
        if (saga && saga !== '' && saga !== this.userData.sagas[0].name)
            this.actualBook.orderInSaga = this.originalBook.orderInSaga;
        else
            this.actualBook.orderInSaga = -1;
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
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Libro ya registrado';
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
        this.actualBook.authors = [];
        this.userData.authors.forEach(a => {
            if (this.authorNames.includes(a.name))
                this.actualBook.authors.push(a);
        });
        this.bookSrv.updateBook(this.actualBook, this.files[0]).subscribe({
            next: (book) => {
                const index = this.userData.books?.findIndex(b => b.bookId === book.bookId);
                if (this.userData.books && index && index !== -1)
                    this.userData.books[index] = book;
                this.updateAuthorsBooks(book);
                this.updateUniverseBooks(book);
                this.updateSagasBooks(book);
                this.sessionSrv.updateUserData(this.userData);
                this.fgBook.reset();
                this.router.navigateByUrl('/dashboard/books?bookUpdated=true');
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

    updateAuthorsBooks(book: Book): void {
        const sagaAuthorsIds = book.authors.map(a => a.authorId);
        this.userData.authors.forEach(author => {
            if (sagaAuthorsIds.includes(author.authorId)) {
                if (!author.books)
                    return;
                const index = author.books.findIndex(b => b.bookId === book.bookId);
                author.books[index] = book;
            }
        });
    }

    updateUniverseBooks(book: Book): void {
        this.userData.universes.forEach(universe => {
            if (book.universeId === universe.universeId) {
                if (!universe.books || !universe.bookIds)
                    return;
                const index = universe.books.findIndex(b => b.bookId === book.bookId);
                universe.books[index] = book;
            }
        });
    }

    updateSagasBooks(book: Book): void {
        this.userData.sagas.forEach(saga => {
            if (book.sagaId === saga.sagaId) {
                if (!saga.books || !saga.bookIds)
                    return;
                const index = saga.books.findIndex(b => b.bookId === book.bookId);
                saga.books[index] = book;
            }
        });
    }
}
