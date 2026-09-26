import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NewBook } from '../../interfaces/creation/newBook';
import { Antology } from '../../interfaces/antology';
import { CoverCacheService } from '../cover-cache.service';
import { writeCatalogAdmin } from './catalog-admin-write';

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

    addAntology(antology: NewBook, imageFile?: File | null): Observable<Antology> {
        return writeCatalogAdmin(this.http, this.coverCache, 'post', this.catalogAdminUrl, this.toCatalogAdminWrite(antology), imageFile).pipe(
            switchMap(created => this.getAntology(created.Id))
        );
    }

    updateAntology(antology: NewBook, imageFile?: File | null): Observable<Antology> {
        return writeCatalogAdmin(this.http, this.coverCache, 'patch', `${this.catalogAdminUrl}/${antology.Id}`, this.toCatalogAdminWrite(antology), imageFile).pipe(
            switchMap(updated => this.getAntology(updated.Id))
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
}
