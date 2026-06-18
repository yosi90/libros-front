import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    ConceptCreate,
    EventCreate,
    LocationCreate,
    OrganizationCharacterRelationWrite,
    OrganizationCreate,
    OrganizationLocationRelationWrite,
    OrganizationRelationUpdate,
    QuoteCreate
} from '../../interfaces/api-contract';
import { Concept } from '../../interfaces/concept';
import { event } from '../../interfaces/event';
import { Location } from '../../interfaces/location';
import { Organization, OrganizationCharacterRelation, OrganizationLocationRelation } from '../../interfaces/organization';
import { Quote } from '../../interfaces/quote';

@Injectable({
    providedIn: 'root'
})
export class NarrativeEntityService {
    constructor(private http: HttpClient) { }

    createLocation(payload: LocationCreate): Observable<Location> {
        return this.http.post<Location>(`${environment.apiUrl}localizaciones`, payload);
    }

    createConcept(payload: ConceptCreate): Observable<Concept> {
        return this.http.post<Concept>(`${environment.apiUrl}conceptos`, payload);
    }

    createOrganization(payload: OrganizationCreate): Observable<Organization> {
        return this.http.post<Organization>(`${environment.apiUrl}organizaciones`, payload);
    }

    createEvent(payload: EventCreate): Observable<event> {
        return this.http.post<event>(`${environment.apiUrl}eventos`, payload);
    }

    createQuote(payload: QuoteCreate): Observable<Quote> {
        return this.http.post<Quote>(`${environment.apiUrl}citas`, payload);
    }

    getOrganizationCharacters(organizationId: number, bookId?: number): Observable<OrganizationCharacterRelation[]> {
        const query = bookId ? `?libroId=${bookId}` : '';
        return this.http.get<OrganizationCharacterRelation[]>(`${environment.apiUrl}organizaciones/${organizationId}/personajes${query}`);
    }

    addOrganizationCharacter(organizationId: number, payload: OrganizationCharacterRelationWrite): Observable<OrganizationCharacterRelation> {
        return this.http.post<OrganizationCharacterRelation>(`${environment.apiUrl}organizaciones/${organizationId}/personajes`, payload);
    }

    updateOrganizationCharacter(organizationId: number, characterId: number, payload: OrganizationRelationUpdate): Observable<OrganizationCharacterRelation> {
        return this.http.put<OrganizationCharacterRelation>(`${environment.apiUrl}organizaciones/${organizationId}/personajes/${characterId}`, payload);
    }

    deleteOrganizationCharacter(organizationId: number, characterId: number): Observable<{ eliminado: boolean }> {
        return this.http.delete<{ eliminado: boolean }>(`${environment.apiUrl}organizaciones/${organizationId}/personajes/${characterId}`);
    }

    getOrganizationLocations(organizationId: number, bookId?: number): Observable<OrganizationLocationRelation[]> {
        const query = bookId ? `?libroId=${bookId}` : '';
        return this.http.get<OrganizationLocationRelation[]>(`${environment.apiUrl}organizaciones/${organizationId}/localizaciones${query}`);
    }

    addOrganizationLocation(organizationId: number, payload: OrganizationLocationRelationWrite): Observable<OrganizationLocationRelation> {
        return this.http.post<OrganizationLocationRelation>(`${environment.apiUrl}organizaciones/${organizationId}/localizaciones`, payload);
    }

    updateOrganizationLocation(organizationId: number, locationId: number, payload: OrganizationRelationUpdate): Observable<OrganizationLocationRelation> {
        return this.http.put<OrganizationLocationRelation>(`${environment.apiUrl}organizaciones/${organizationId}/localizaciones/${locationId}`, payload);
    }

    deleteOrganizationLocation(organizationId: number, locationId: number): Observable<{ eliminado: boolean }> {
        return this.http.delete<{ eliminado: boolean }>(`${environment.apiUrl}organizaciones/${organizationId}/localizaciones/${locationId}`);
    }
}
