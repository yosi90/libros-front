import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getReadBooks() {
        return this.http.get<{ libros_leidos: number }>(`${this.baseUrl}libros/leidos`);
    }

    getUnreadBooks() {
        return this.http.get<{ libros_no_leidos: number }>(`${this.baseUrl}libros/no_leidos`);
    }

    getBookLongestUnread() {
        return this.http.get<any>(`${this.baseUrl}libros/sin_leer`);
    }

    getBooksPurchased() {
        return this.http.get<any[]>(`${this.baseUrl}libros/comprados`);
    }

    getBooksPendingPurchase() {
        return this.http.get<any[]>(`${this.baseUrl}libros/por_comprar`);
    }

    getFastestReadBook() {
        return this.http.get<any>(`${this.baseUrl}libros/mas_rapido`);
    }

    getFastestReadBooks() {
        return this.http.get<any>(`${this.baseUrl}libros/top_mas_rapido`);
    }

    getReadAntologies() {
        return this.http.get<{ antologias_leidas: number }>(`${this.baseUrl}antologias/leidos`);
    }

    getReadingHistory() {
        return this.http.get<any[]>(`${this.baseUrl}libros/historial_leidos`);
    }

    getAverageReadingTime() {
        return this.http.get<{ promedio_dias: number }>(`${this.baseUrl}libros/promedio_compra_lectura`);
    }
}
