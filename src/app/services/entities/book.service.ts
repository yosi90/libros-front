import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Book } from '../../interfaces/book';
import { CharacterOrderSummary } from '../../interfaces/character';
import { environment } from '../../../environment/environment';

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

    constructor(private http: HttpClient) {
        super();
    }

    getBook(bookId: number): Observable<Book> {
        return this.http.get<Book>(`${this.booksUrl}/${bookId}`)
            .pipe(map(book => this.normalizeBook(book)));
    }

    getAnthologySection(bookId: number): Observable<Book> {
        return this.http.get<AnthologySectionDetailResponse>(`${environment.apiUrl}antologias/secciones/${bookId}`)
            .pipe(map(response => this.normalizeBook({
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

    private normalizeBook(book: Partial<Book>): Book {
        const chapters = Array.isArray(book.Capitulos)
            ? book.Capitulos.map(chapter => ({ ...chapter, Escenas: Array.isArray(chapter.Escenas) ? chapter.Escenas : [] }))
            : [];
        const interludes = Array.isArray(book.Interludios)
            ? book.Interludios.map(interlude => ({
                ...interlude,
                Capitulos: Array.isArray(interlude.Capitulos)
                    ? interlude.Capitulos.map(chapter => ({ ...chapter, Escenas: Array.isArray(chapter.Escenas) ? chapter.Escenas : [] }))
                    : []
            }))
            : [];
        return {
            ...book,
            Id: Number(book.Id),
            Nombre: book.Nombre ?? '',
            Orden: Number(book.Orden ?? 0),
            Portada: book.Portada ?? '',
            Autores: Array.isArray(book.Autores) ? book.Autores : [],
            Estados: Array.isArray(book.Estados) ? book.Estados : [],
            Capitulos: chapters,
            Partes: Array.isArray(book.Partes) ? book.Partes : [],
            Interludios: interludes,
            Personajes: Array.isArray(book.Personajes) ? book.Personajes : [],
            Localizaciones: Array.isArray(book.Localizaciones) ? book.Localizaciones : [],
            Conceptos: Array.isArray(book.Conceptos) ? book.Conceptos : [],
            Organizaciones: Array.isArray(book.Organizaciones) ? book.Organizaciones : [],
            Eventos: Array.isArray(book.Eventos) ? book.Eventos : [],
            Citas: Array.isArray(book.Citas) ? book.Citas : [],
            Universo: book.Universo ?? { Id: 0, Nombre: 'Sin universo' },
            Saga: book.Saga ?? { Id: 0, Nombre: 'Sin saga' }
        };
    }

}
