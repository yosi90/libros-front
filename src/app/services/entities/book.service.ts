import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, switchMap, tap } from 'rxjs';
import { Book, BookSimple } from '../../interfaces/book';
import { CharacterOrderSummary } from '../../interfaces/character';
import { environment } from '../../../environment/environment';
import { NewBook } from '../../interfaces/creation/newBook';
import { BookLanguagesWrite, CatalogAdminEntity } from '../../interfaces/catalog';
import { CoverCacheService } from '../cover-cache.service';

@Injectable({
    providedIn: 'root'
})
export class BookService extends ErrorHandlerService {
    private readonly booksUrl = environment.apiUrl + 'libros';
    private readonly catalogAdminUrl = environment.apiUrl + 'catalogo/admin/libros';

    constructor(private http: HttpClient, private coverCache: CoverCacheService) {
        super();
    }

    getCover(imagePath: string): Observable<File> {
        return this.coverCache.getCoverFile(imagePath)
            .pipe(
                catchError(error => {
                    this.errorHandle(error, 'Libro');
                    throw error;
                })
            );
    }

    getBook(bookId: number): Observable<Book> {
        return this.http.get<Book>(`${this.booksUrl}/${bookId}`);
    }

    getCharacterOrder(bookId: number): Observable<CharacterOrderSummary[]> {
        return this.http.get<CharacterOrderSummary[]>(`${this.booksUrl}/${bookId}/personajes/orden`);
    }

    addBook(book: NewBook, imageFile: File): Observable<BookSimple> {
        const payload = this.toCatalogAdminWrite(book);
        return this.http.post<CatalogAdminEntity>(this.catalogAdminUrl, this.toBookFormData(payload, imageFile)).pipe(
            switchMap(created => this.getBook(created.Id)),
            tap(createdBook => this.invalidateCreatedCover(createdBook.Portada))
        );
    }

    updateBook(book: NewBook, imageFile?: File): Observable<BookSimple> {
        const payload = this.toCatalogAdminWrite(book);
        const body = imageFile ? this.toBookFormData(payload, imageFile) : payload;
        return this.http.patch<CatalogAdminEntity>(`${this.catalogAdminUrl}/${book.Id}`, body).pipe(
            switchMap(updated => this.getBook(updated.Id)),
            tap(updatedBook => this.invalidateCreatedCover(updatedBook.Portada))
        );
    }

    addBookLanguages(bookId: number, payload: BookLanguagesWrite): Observable<Book> {
        return this.getBook(bookId).pipe(
            map(book => [
                ...(book.IdiomasDisponibles ?? []).flatMap(language => typeof language === 'string' ? [] : [language.Id]),
                ...payload.Idiomas.map(language => typeof language === 'number' ? language : language.Id)
            ]),
            switchMap(languageIds => this.updateBookLanguages(bookId, { Idiomas: [...new Set(languageIds)] }))
        );
    }

    updateBookLanguages(bookId: number, payload: BookLanguagesWrite): Observable<Book> {
        const languageIds = payload.Idiomas.map(language => typeof language === 'number' ? language : language.Id);
        return this.http.patch<CatalogAdminEntity>(`${this.catalogAdminUrl}/${bookId}`, { Idiomas: languageIds }).pipe(
            switchMap(updated => this.getBook(updated.Id))
        );
    }

    private toBookFormData(book: Record<string, unknown>, imageFile: File): FormData {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('data', JSON.stringify(book));
        return formData;
    }

    private toCatalogAdminWrite(book: NewBook): Record<string, unknown> {
        const sagaId = book.Saga?.Id || null;
        return {
            Nombre: book.Nombre,
            ISBN: book.ISBN ?? undefined,
            Paginas: book.Paginas ?? undefined,
            Sinopsis: book.Sinopsis ?? undefined,
            FechaPublicacion: book.FechaPublicacion ?? undefined,
            Orden: book.Orden,
            Autores: book.Autores.map(author => author.Id),
            Estilos: book.Estilos?.map(style => typeof style === 'number' ? style : style.Id),
            ...(sagaId ? { SagaId: sagaId } : { UniversoId: book.Universo.Id })
        };
    }

    private invalidateCreatedCover(coverName: string | null | undefined): void {
        if (coverName)
            this.coverCache.invalidateCover(coverName);
    }

}
