import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { NewBook } from '../../interfaces/creation/newBook';
import { UpdateResponse } from '../../interfaces/user-update-response';
import { Antology } from '../../interfaces/antology';
import { CoverCacheService } from '../cover-cache.service';

@Injectable({
    providedIn: 'root'
})
export class AntologyService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'antologias';

    constructor(private http: HttpClient, private sessionSrv: SessionService, private coverCache: CoverCacheService) {
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

    addAntology(antology: NewBook, imageFile: File): Observable<Antology> {
        return this.http.post<Antology>(this.apiUrl, antology).pipe(
            switchMap((createdBook: Antology) => {
                const image = `a_${this.sessionSrv.userId}_${createdBook.Id}.png`;
                const formData = new FormData();
                formData.append('image', imageFile);
                return this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData)
                    .pipe(tap(() => this.coverCache.invalidateCover(image)))
                    .pipe(map(() => createdBook));
            })
        );
    }

    updateAntology(antology: NewBook, imageFile: File): Observable<Antology> {
        const image = `a_${this.sessionSrv.userId}_${antology.Id}.png`;
        const formData = new FormData();
        formData.append('image', imageFile);

        const updateBook$ = this.http.patch<Antology>(this.apiUrl, antology);
        const updateImage$ = this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/cover/${image}`, formData)
            .pipe(tap(() => this.coverCache.invalidateCover(image)));

        return forkJoin([updateImage$, updateBook$]).pipe(
            map(([, updatedAntology]) => updatedAntology)
        );
    }

}
