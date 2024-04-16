import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ImgService {

    constructor(private http: HttpClient) { }

    async checkIfImageExists(bookId: number): Promise<boolean> {
        const imageUrl = this.getImageUrl(bookId);
        try {
            await this.http.head(imageUrl).toPromise();
            return true;
        } catch (error) {
            return false;
        }
    }

    getImageUrl(bookId: number): string {
        return `assets/media/covers/${bookId}.jpg`;
    }
}
