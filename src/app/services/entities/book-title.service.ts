import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

/**
 * El título divertido de la persona para un libro de su colección y sus generaciones con IA de hoy. Generado con IA
 * puede traer además una pequeña cabecera animada: `Html` (un fragmento sin scripts ni atributos peligrosos) y `Estilos`
 * (CSS con `@import` solo de las fuentes y los CDN permitidos), los dos saneados en el servidor; a mano, los dos null.
 */
export interface BookFunTitle {
    success?: boolean;
    Titulo: string | null;
    Html?: string | null;
    Estilos?: string | null;
    Generaciones: { Hoy: number; Limite: number };
}

/**
 * El título divertido de cada persona para un libro de su colección (`/coleccion/libros/{id}/titulo`). Solo lo ve su
 * dueño. Fuera de su colección la API responde `404 book_not_in_collection`.
 */
@Injectable({ providedIn: 'root' })
export class BookTitleService {
    private readonly apiUrl = environment.apiUrl + 'coleccion/libros';

    constructor(private http: HttpClient) { }

    get(bookId: number): Observable<BookFunTitle> {
        return this.http.get<BookFunTitle>(`${this.apiUrl}/${bookId}/titulo`);
    }

    /** Hasta 200 caracteres; vacío o null lo quita. Deja `Html` y `Estilos` a null. */
    save(bookId: number, title: string | null): Observable<BookFunTitle> {
        return this.http.put<BookFunTitle>(`${this.apiUrl}/${bookId}/titulo`, { Titulo: title });
    }

    /** Lo genera con IA con la clave de la persona para ese proveedor, lo guarda y lo devuelve. */
    generate(bookId: number, model: string, provider: 'anthropic' | 'openai'): Observable<BookFunTitle> {
        return this.http.post<BookFunTitle>(`${this.apiUrl}/${bookId}/titulo/generar`, { Modelo: model, Proveedor: provider });
    }
}
