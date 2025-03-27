import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { NewBook } from '../../interfaces/creation/newBook';
import { UpdateResponse } from '../../interfaces/user-update-response';
import { Antology } from '../../interfaces/antology';

@Injectable({
    providedIn: 'root'
})
export class AntologyService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'antologias';

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getCover(imagePath: string): Observable<File> {
        return this.http.get(`${environment.apiUrl}image/blob/${this.sessionSrv.userId}/${imagePath}`, { responseType: 'arraybuffer' }).pipe(
            map((imageBytes: ArrayBuffer) => {
                const blob = new Blob([imageBytes], { type: 'image/jpeg' });
                const file = new File([blob], imagePath, { type: 'image/jpeg' });
                return file;
            }),
            catchError(error => {
                this.errorHandle(error, 'Libro');
                throw error;
            })
        );
    }

    addAntology(book: NewBook, imageFile: File): Observable<Antology> {
        book.UserId = this.sessionSrv.userId;
        return this.http.post<Antology>(this.apiUrl, book).pipe(
            switchMap((createdBook: Antology) => {
                const image = `a_${this.sessionSrv.userId}_${createdBook.Id}.png`;
                const formData = new FormData();
                formData.append('image', imageFile);
                return this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData)
                    .pipe(map(() => createdBook));
            })
        );
    }

    updateAntology(book: Antology, imageFile: File): Observable<Antology> {
        const image = `a_${this.sessionSrv.userId}_${book.Id}.png`;
        const formData = new FormData();
        formData.append('image', imageFile);

        const updateBook$ = this.http.patch<Antology>(this.apiUrl, book);
        const updateImage$ = this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData);

        return forkJoin([updateImage$, updateBook$]).pipe(
            map(([, updatedAntology]) => updatedAntology)
        );
    }

    newStatus(bookId: number, status: string): Observable<Antology> {
        return this.http.patch<Antology>(`${this.apiUrl}/${bookId}/newstatus`, status);
    }
}
