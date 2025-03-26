import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Author } from '../../interfaces/author';

@Injectable({ providedIn: 'root' })
export class AuthorStoreService {
    autorVacio: Author = {
        Id: 0,
        Nombre: ''
    }

    private authorsSubject = new BehaviorSubject<Author[]>([]);
    public authors$ = this.authorsSubject.asObservable();

    getAuthors(): Author[] {
        return this.authorsSubject.getValue();
    }

    getAuthor(id: number): Author {
        const autorEncontrado = this.getAuthors().find(a => a.Id === id);
        return autorEncontrado ?? this.autorVacio;
    }

    updateAuthor(author: Author): void {
        const updatedAuthors = this.getAuthors().map(a => 
            a.Id === author.Id ? { ...a, Nombre: author.Nombre } : a
        );
        this.authorsSubject.next([...updatedAuthors]);
    }    

    setAuthors(authors: Author[]): void {
        this.authorsSubject.next(authors);
    }

    addAuthor(newAuthor: Author): void {
        const current = this.getAuthors();
        const exists = current.some(a => a.Id === newAuthor.Id);

        if (!exists) {
            this.authorsSubject.next([...current, newAuthor]);
        }
    }

    clear(): void {
        this.authorsSubject.next([]);
    }
} 
