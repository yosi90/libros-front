import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NewBook } from '../../interfaces/creation/newBook';
import { Antology } from '../../interfaces/antology';
import { CoverCacheService } from '../cover-cache.service';
import { CatalogAdminEntity } from '../../interfaces/catalog';

@Injectable({
    providedIn: 'root'
})
export class AntologyService extends ErrorHandlerService {
    private readonly apiUrl = environment.apiUrl + 'antologias';
    private readonly catalogAdminUrl = environment.apiUrl + 'catalogo/admin/antologias';

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
        const payload = this.toCatalogAdminWrite(antology);
        return this.http.post<CatalogAdminEntity>(this.catalogAdminUrl, payload).pipe(
            switchMap(created => this.getAntology(created.Id)),
            switchMap(createdAntology => this.uploadCover(createdAntology, imageFile))
        );
    }

    updateAntology(antology: NewBook, imageFile?: File): Observable<Antology> {
        const payload = this.toCatalogAdminWrite(antology);
        return this.http.patch<CatalogAdminEntity>(`${this.catalogAdminUrl}/${antology.Id}`, payload).pipe(
            switchMap(updated => this.getAntology(updated.Id)),
            switchMap(updatedAntology => this.uploadCover(updatedAntology, imageFile))
        );
    }

    getAntology(antologyId: number): Observable<Antology> {
        return this.http.get<Antology>(`${this.apiUrl}/${antologyId}`);
    }

    private toCatalogAdminWrite(antology: NewBook): Record<string, unknown> {
        const sagaId = antology.Saga?.Id || null;
        return {
            Nombre: antology.Nombre,
            ISBN: antology.ISBN ?? undefined,
            Paginas: antology.Paginas ?? undefined,
            Sinopsis: antology.Sinopsis ?? undefined,
            FechaPublicacion: antology.FechaPublicacion ?? undefined,
            Orden: antology.Orden,
            Autores: antology.Autores.map(author => author.Id),
            Estilos: antology.Estilos?.map(style => typeof style === 'number' ? style : style.Id),
            ...(sagaId ? { SagaId: sagaId } : { UniversoId: antology.Universo.Id })
        };
    }

    private uploadCover(antology: Antology, imageFile?: File): Observable<Antology> {
        if (!imageFile || !antology.Portada)
            return of(antology);
        return this.coverCache.setCover(antology.Portada, imageFile).pipe(map(() => antology));
    }

}
