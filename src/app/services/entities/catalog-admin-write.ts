import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CatalogAdminEntity } from '../../interfaces/catalog';
import { CoverCacheService } from '../cover-cache.service';

/**
 * Escritura en `/catalogo/admin/libros|antologias`. Con portada se envía
 * `multipart/form-data` (`payload` con el JSON e `image` con la imagen) y el backend
 * guarda datos y portada en la misma transacción; sin portada, JSON.
 * Tras guardar se invalida la portada devuelta para que se vea la nueva.
 */
export function writeCatalogAdmin<T extends { Portada?: string } = CatalogAdminEntity>(
    http: HttpClient,
    coverCache: CoverCacheService,
    method: 'post' | 'patch',
    url: string,
    payload: object,
    imageFile?: File | null
): Observable<T> {
    let body: object | FormData = payload;
    if (imageFile) {
        const form = new FormData();
        form.append('payload', JSON.stringify(payload));
        form.append('image', imageFile);
        body = form;
    }
    const request = method === 'post'
        ? http.post<T>(url, body)
        : http.patch<T>(url, body);
    return request.pipe(tap(entity => {
        if (entity.Portada) coverCache.invalidateCover(entity.Portada);
    }));
}
