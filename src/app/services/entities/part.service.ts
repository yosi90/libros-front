import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { PartWrite } from '../../interfaces/api-contract';
import { Part } from '../../interfaces/part';

@Injectable({
    providedIn: 'root'
})
export class PartService {
    private apiUrl = environment.apiUrl + 'partes';

    constructor(private http: HttpClient) { }

    createForBook(bookId: number, payload: PartWrite): Observable<Part> {
        return this.http.post<Part>(`${this.apiUrl}/libros/${bookId}`, payload);
    }

    update(partId: number, payload: PartWrite): Observable<Part> {
        return this.http.put<Part>(`${this.apiUrl}/${partId}`, payload);
    }
}
