import { Observable } from 'rxjs';
import { ReadingStatusId } from '../interfaces/read-status';
import { CollectionService } from '../services/entities/collection.service';

/** Lo que edita el editor de estado, puntuación y reseña de una obra de la biblioteca. */
export interface CollectionStateValues {
    status: ReadingStatusId | null;
    rating: number | null;
    review: string;
}

export interface CollectionWork {
    Tipo: 'libro' | 'antologia';
    Id: number;
}

/**
 * Peticiones para guardar el editor de estado de una obra. Solo se envía lo que cambia:
 * cada estado enviado crea un histórico nuevo en el backend, así que repetir el actual
 * lo duplicaría. Una reseña o puntuación previa no se puede vaciar quitando la puntuación.
 * Lo comparten la Biblioteca, el Catálogo y los gestores del Perfil.
 */
export function collectionStateRequests(
    collection: CollectionService,
    work: CollectionWork,
    draft: CollectionStateValues,
    original: CollectionStateValues,
    excludeActivity: boolean
): Observable<unknown>[] | { error: string } {
    const activity = excludeActivity ? { PublicarActividad: false } : {};
    const review = draft.review.trim() || null;
    const requests: Observable<unknown>[] = [];

    if (draft.status !== null && draft.status !== original.status) {
        const payload = { EstadoId: draft.status, ...activity };
        requests.push(work.Tipo === 'libro'
            ? collection.updateBookStatus(work.Id, payload)
            : collection.updateAnthologyStatus(work.Id, payload));
    }

    if (draft.rating !== null) {
        if (draft.rating !== original.rating || draft.review.trim() !== original.review.trim()) {
            const payload = { Puntuacion: draft.rating, Resena: review, ...activity };
            requests.push(work.Tipo === 'libro'
                ? collection.updateBookRating(work.Id, payload)
                : collection.updateAnthologyRating(work.Id, payload));
        }
    } else if (original.rating !== null) {
        return { error: 'La reseña necesita una puntuación' };
    }

    return requests;
}
