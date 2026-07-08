import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NewBook } from '../../interfaces/creation/newBook';
import { Antology } from '../../interfaces/antology';
import { CoverCacheService } from '../cover-cache.service';

@Injectable({
    providedIn: 'root'
})
export class AntologyService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'antologias';

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

    addAntology(antology: NewBook, imageFile: File): Observable<Antology> {
        return this.http.post<Antology>(this.apiUrl, this.toAntologyFormData(antology, imageFile))
            .pipe(tap(createdAntology => this.invalidateCreatedCover(createdAntology.Portada)));
    }

    updateAntology(antology: NewBook, imageFile: File): Observable<Antology> {
        return this.http.patch<Antology>(this.apiUrl, this.toAntologyFormData(antology, imageFile))
            .pipe(tap(updatedAntology => this.invalidateCreatedCover(updatedAntology.Portada)));
    }

    private toAntologyFormData(antology: NewBook, imageFile: File): FormData {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('data', JSON.stringify(antology));
        return formData;
    }

    private invalidateCreatedCover(coverName: string | null | undefined): void {
        if (coverName)
            this.coverCache.invalidateCover(coverName);
    }

}
