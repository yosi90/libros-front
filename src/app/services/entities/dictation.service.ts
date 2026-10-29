import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { TranscriptionProvider } from '../platform/platform-ai.service';

export interface DictationResult {
    success?: boolean;
    Texto: string;
    Dictados?: { Hoy: number; Limite: number };
}

/**
 * El dictado con la clave de IA de la persona (`POST /dictado`, roadmap de la IA de la API, IA3): un trozo de audio y el
 * modelo de transcripción que eligió; con el libro, sus nombres van como pista. El dictado del navegador no pasa por
 * aquí. El audio no se guarda.
 */
@Injectable({ providedIn: 'root' })
export class DictationService {
    private readonly apiUrl = environment.apiUrl + 'dictado';

    constructor(private http: HttpClient) { }

    transcribe(audio: Blob, provider: TranscriptionProvider, model: string, bookId: number | null): Observable<DictationResult> {
        const form = new FormData();
        const extension = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
        form.append('Audio', audio, `dictado.${extension}`);
        form.append('Proveedor', provider);
        form.append('Modelo', model);
        if (bookId) form.append('LibroId', String(bookId));
        return this.http.post<DictationResult>(this.apiUrl, form);
    }
}
