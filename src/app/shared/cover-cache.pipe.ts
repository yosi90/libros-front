import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { CoverCacheService } from '../services/cover-cache.service';

@Pipe({
    name: 'coverCache',
    standalone: true
})
export class CoverCachePipe implements PipeTransform {
    constructor(private coverCache: CoverCacheService) { }

    transform(coverName: string | null | undefined): Observable<string> {
        return this.coverCache.getCoverUrl(coverName);
    }
}
