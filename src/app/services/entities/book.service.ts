import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { Book, BookSimple } from '../../interfaces/book';
import { CharacterOrderSummary } from '../../interfaces/character';
import { environment } from '../../../environment/environment';
import { NewBook } from '../../interfaces/creation/newBook';
import { BookLanguagesWrite, CatalogAdminEntity } from '../../interfaces/catalog';
import { CoverCacheService } from '../cover-cache.service';

interface AnthologySectionDetailResponse {
    Antologia: { Id: number; Nombre: string };
    Libro: Book;
    PaginaInicio?: number | null;
    PaginaFinal?: number | null;
}

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

    getAnthologySection(bookId: number): Observable<Book> {
        return this.http.get<AnthologySectionDetailResponse>(`${environment.apiUrl}antologias/secciones/${bookId}`)
            .pipe(map(response => ({
                ...response.Libro,
                // Este endpoint contextual procede del contrato legacy y QA
                // serializa sus identificadores como texto. El router y el
                // coordinador nativo exigen una identidad numérica canónica.
                Id: Number(response.Libro.Id)
            })));
    }

    getCharacterOrder(bookId: number): Observable<CharacterOrderSummary[]> {
        return this.http.get<CharacterOrderSummary[]>(`${this.booksUrl}/${bookId}/personajes/orden`);
    }

    addBook(book: NewBook, imageFile: File): Observable<BookSimple> {
        const payload = this.toCatalogAdminWrite(book);
        return this.http.post<CatalogAdminEntity>(this.catalogAdminUrl, payload).pipe(
            switchMap(created => this.getBook(created.Id)),
            switchMap(createdBook => this.uploadCover(createdBook, imageFile))
        );
    }

    updateBook(book: NewBook, imageFile?: File): Observable<BookSimple> {
        const payload = this.toCatalogAdminWrite(book);
        return this.http.patch<CatalogAdminEntity>(`${this.catalogAdminUrl}/${book.Id}`, payload).pipe(
            switchMap(updated => this.getBook(updated.Id)),
            switchMap(updatedBook => this.uploadCover(updatedBook, imageFile))
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

    private uploadCover(book: BookSimple, imageFile?: File): Observable<BookSimple> {
        if (!imageFile || !book.Portada)
            return of(book);
        return this.coverCache.setCover(book.Portada, imageFile).pipe(map(() => book));
    }

}
