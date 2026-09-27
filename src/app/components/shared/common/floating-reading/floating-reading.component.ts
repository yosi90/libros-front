import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, Observable, of, Subscription } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { CatalogOwnCollection, CatalogPublicDetail } from '../../../../interfaces/catalog';
import { BookNote } from '../../../../interfaces/note';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { BookService } from '../../../../services/entities/book.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { NoteService } from '../../../../services/entities/note.service';
import { ParkedReading, ReadingReturnService } from '../../../../services/navigation/reading-return.service';
import { StatisticsService } from '../../../../services/other/statistics.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { LibrarySyncService } from '../../../../services/stores/library-sync.service';
import { ReadingProgress, readingProgress } from '../../../../shared/book-charts';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { getStatusId, readingStatusOptions } from '../../../../shared/reading-status';

/**
 * Ventana «Estabas leyendo» (escritorio en Web y Wood). A su tamaño mínimo solo
 * muestra el libro y «Seguir leyendo»; al agrandarla o maximizarla aparecen el
 * progreso, el estado de lectura, la valoración con reseña y las notas. El
 * reparto responde al tamaño de la propia ventana (consultas de contenedor).
 */
@Component({
    selector: 'app-floating-reading',
    standalone: true,
    imports: [AsyncPipe, DatePipe, FormsModule, MatIconModule, CoverCachePipe, SnackbarModule],
    templateUrl: './floating-reading.component.html',
    styleUrl: './floating-reading.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloatingReadingComponent implements OnInit, OnDestroy {
    readonly statusOptions = readingStatusOptions;
    readonly stars = [1, 2, 3, 4, 5];

    bookId = 0;
    progress: ReadingProgress | null = null;
    collection: CatalogOwnCollection | null = null;
    /** Sección de antología u otro caso sin ficha propia: no se ofrece estado ni reseña. */
    collectionUnavailable = false;
    notes: BookNote[] = [];
    loading = true;

    rating: number | null = null;
    review = '';
    noteTitle = '';
    noteText = '';
    savingStatus = false;
    savingReview = false;
    savingNote = false;
    showNoteForm = false;

    private subscription = new Subscription();

    constructor(
        readonly reading: ReadingReturnService,
        private books: BookService,
        private bookStore: BookStoreService,
        private statistics: StatisticsService,
        private catalog: CatalogService,
        private collectionSrv: CollectionService,
        private notesSrv: NoteService,
        private librarySync: LibrarySyncService,
        private snackBar: SnackbarModule,
        private changeDetector: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const parked = this.reading.parked();
        if (parked) this.load(parked);
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    get currentStatusId(): ReadingStatusId | null {
        return this.collection?.EstadoActual?.EstadoId ?? null;
    }

    get reviewChanged(): boolean {
        return (this.rating ?? null) !== (this.collection?.Puntuacion ?? null) || this.review.trim() !== (this.collection?.Resena ?? '').trim();
    }

    setStatus(statusId: ReadingStatusId): void {
        if (this.savingStatus || statusId === this.currentStatusId) return;
        this.savingStatus = true;
        this.subscription.add(this.collectionSrv.updateBookStatus(this.bookId, { EstadoId: statusId }).subscribe({
            next: () => {
                this.savingStatus = false;
                this.librarySync.refreshAfterCatalogChange();
                this.reloadCollection();
            },
            error: error => {
                this.savingStatus = false;
                this.snackBar.openApiError(error, 'Error al cambiar el estado de lectura');
                this.changeDetector.markForCheck();
            }
        }));
    }

    saveReview(): void {
        if (this.savingReview || !this.reviewChanged) return;
        this.savingReview = true;
        const resena = this.review.trim() || null;
        const request: Observable<unknown> = this.rating
            ? this.collectionSrv.updateBookRating(this.bookId, { Puntuacion: this.rating, Resena: resena })
            : this.collectionSrv.updateBookReview(this.bookId, { Resena: resena });
        this.subscription.add(request.subscribe({
            next: () => {
                this.savingReview = false;
                this.snackBar.openSnackBar('Reseña guardada', 'successBar');
                this.reloadCollection();
            },
            error: (error: unknown) => {
                this.savingReview = false;
                this.snackBar.openApiError(error, 'Error al guardar la reseña');
                this.changeDetector.markForCheck();
            }
        }));
    }

    addNote(): void {
        const title = this.noteTitle.trim();
        const text = this.noteText.trim();
        if (this.savingNote || !title || !text) return;
        this.savingNote = true;
        this.subscription.add(this.notesSrv.create({ Nombre: title, Descripcion: text, LibroId: this.bookId }).subscribe({
            next: note => {
                this.savingNote = false;
                this.noteTitle = '';
                this.noteText = '';
                this.showNoteForm = false;
                if (note?.Id) this.notes = [note, ...this.notes];
                this.snackBar.openSnackBar('Nota guardada', 'successBar');
                this.changeDetector.markForCheck();
            },
            error: error => {
                this.savingNote = false;
                this.snackBar.openApiError(error, 'Error al guardar la nota');
                this.changeDetector.markForCheck();
            }
        }));
    }

    private load(parked: ParkedReading): void {
        this.bookId = parked.bookId;
        const stored = this.bookStore.getBook();
        const book$ = stored.Id === parked.bookId ? of(stored) : this.books.getBook(parked.bookId).pipe(catchError(() => of(null)));
        this.subscription.add(forkJoin({
            book: book$,
            detail: this.catalog.getBookPublicDetail(parked.bookId).pipe(catchError(() => of(null))),
            notes: this.notesSrv.getByBook(parked.bookId).pipe(catchError(() => of([] as BookNote[])))
        }).subscribe(({ book, detail, notes }) => {
            this.applyDetail(detail);
            this.progress = book ? this.progressOf(book) : null;
            this.notes = [...notes].sort((a, b) => (b.Fecha ?? '').localeCompare(a.Fecha ?? ''));
            this.loading = false;
            this.changeDetector.markForCheck();
        }));
    }

    private reloadCollection(): void {
        this.subscription.add(this.catalog.getBookPublicDetail(this.bookId).pipe(catchError(() => of(null))).subscribe(detail => {
            this.applyDetail(detail);
            this.changeDetector.markForCheck();
        }));
    }

    private applyDetail(detail: CatalogPublicDetail | null): void {
        this.collection = detail?.MiColeccion ?? null;
        this.collectionUnavailable = !detail;
        this.rating = this.collection?.Puntuacion ?? null;
        this.review = this.collection?.Resena ?? '';
    }

    private progressOf(book: Book): ReadingProgress {
        const finished = (book.Estados ?? []).some(status => getStatusId(status) === 2);
        return readingProgress(book, this.statistics.getBookStatisticsFromBook(book), finished);
    }
}
