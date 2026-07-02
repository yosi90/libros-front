import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    ConceptCreate,
    ConceptUpdate,
    EntityWriteResponse,
    EventCreate,
    EventUpdate,
    LocationCreate,
    LocationUpdate,
    OrganizationCharacterRelationWrite,
    OrganizationCreate,
    OrganizationLocationRelationWrite,
    OrganizationRelationUpdate,
    OrganizationUpdate,
    QuoteUpdate,
    QuoteCreate
} from '../../interfaces/api-contract';
import { Concept } from '../../interfaces/concept';
import { event } from '../../interfaces/event';
import { Location, LocationStatus } from '../../interfaces/location';
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

    getLocationStates(): Observable<LocationStatus[]> {
        return this.http.get<unknown>(`${environment.apiUrl}estado_localizacion/catalogo`).pipe(
            map(response => this.toLocationStates(response))
        );
    }

    updateLocation(locationId: number, payload: LocationUpdate): Observable<Location | EntityWriteResponse> {
        return this.http.patch<Location | EntityWriteResponse>(`${environment.apiUrl}localizaciones/${locationId}`, payload);
    }

    detachLocationFromBook(locationId: number, bookId: number): Observable<EntityWriteResponse> {
        return this.http.delete<EntityWriteResponse>(`${environment.apiUrl}localizaciones/${locationId}/libros/${bookId}`);
    }

    createConcept(payload: ConceptCreate): Observable<Concept> {
        return this.http.post<Concept>(`${environment.apiUrl}conceptos`, payload);
    }

    updateConcept(conceptId: number, payload: ConceptUpdate): Observable<Concept | EntityWriteResponse> {
        return this.http.patch<Concept | EntityWriteResponse>(`${environment.apiUrl}conceptos/${conceptId}`, payload);
    }

    detachConceptFromBook(conceptId: number, bookId: number): Observable<EntityWriteResponse> {
        return this.http.delete<EntityWriteResponse>(`${environment.apiUrl}conceptos/${conceptId}/libros/${bookId}`);
    }

    createOrganization(payload: OrganizationCreate): Observable<Organization> {
        return this.http.post<Organization>(`${environment.apiUrl}organizaciones`, payload);
    }

    updateOrganization(organizationId: number, payload: OrganizationUpdate): Observable<Organization | EntityWriteResponse> {
        return this.http.patch<Organization | EntityWriteResponse>(`${environment.apiUrl}organizaciones/${organizationId}`, payload);
    }

    detachOrganizationFromBook(organizationId: number, bookId: number): Observable<EntityWriteResponse> {
        return this.http.delete<EntityWriteResponse>(`${environment.apiUrl}organizaciones/${organizationId}/libros/${bookId}`);
    }

    createEvent(payload: EventCreate): Observable<event> {
        return this.http.post<event>(`${environment.apiUrl}eventos`, payload);
    }

    updateEvent(eventId: number, payload: EventUpdate): Observable<event | EntityWriteResponse> {
        return this.http.patch<event | EntityWriteResponse>(`${environment.apiUrl}eventos/${eventId}`, payload);
    }

    detachEventFromBook(eventId: number, bookId: number): Observable<EntityWriteResponse> {
        return this.http.delete<EntityWriteResponse>(`${environment.apiUrl}eventos/${eventId}/libros/${bookId}`);
    }

    createQuote(payload: QuoteCreate): Observable<Quote> {
        return this.http.post<Quote>(`${environment.apiUrl}citas`, payload);
    }

    updateQuote(quoteId: number, payload: QuoteUpdate): Observable<Quote | EntityWriteResponse> {
        return this.http.patch<Quote | EntityWriteResponse>(`${environment.apiUrl}citas/${quoteId}`, payload);
    }

    detachQuoteFromBook(quoteId: number, bookId: number): Observable<EntityWriteResponse> {
        return this.http.delete<EntityWriteResponse>(`${environment.apiUrl}citas/${quoteId}/libros/${bookId}`);
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

    private toLocationStates(response: unknown): LocationStatus[] {
        if (Array.isArray(response))
            return response as LocationStatus[];

        if (response && typeof response === 'object') {
            const record = response as Record<string, unknown>;
            if (Array.isArray(record['Estados']))
                return record['Estados'] as LocationStatus[];
            if (Array.isArray(record['Items']))
                return record['Items'] as LocationStatus[];
        }

        return [];
    }
}
