import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformApiService } from './platform-api.service';

/** Cuántas relaciones tiene la cuenta en la plataforma (`GET /v1/social/resumen`, ENDPOINTS.md). */
export interface PlatformSocialSummary {
    solicitudesRecibidas: number;
    solicitudesEnviadas: number;
    amistades: number;
    seguidos: number;
    seguidores: number;
    bloqueos: number;
}

/**
 * Las personas y las relaciones son de la plataforma (ecosistema-kit/SOCIAL.md): Libros solo enseña los contadores en
 * su resumen de Comunidad y lleva a la web social, con el símbolo del ecosistema, para gestionarlas.
 */
@Injectable({ providedIn: 'root' })
export class PlatformSocialService {
    constructor(private api: PlatformApiService) { }

    summary(): Observable<PlatformSocialSummary> {
        return this.api.get<PlatformSocialSummary>('/v1/social/resumen');
    }
}
