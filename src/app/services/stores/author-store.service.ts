import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Author } from '../../interfaces/author';

@Injectable({ providedIn: 'root' })
export class AuthorStoreService {

    private authorsSubject = new BehaviorSubject<Author[]>([]);
    public authors$ = this.authorsSubject.asObservable();

    getAuthors(): Author[] {
        return this.authorsSubject.getValue();
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
