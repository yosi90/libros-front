import { of } from 'rxjs';
import { CollectionService } from '../services/entities/collection.service';
import { collectionStateRequests, CollectionStateValues } from './collection-state';

describe('collectionStateRequests', () => {
    let collection: jasmine.SpyObj<CollectionService>;
    const book = { Tipo: 'libro' as const, Id: 7 };
    const original: CollectionStateValues = { status: 1, rating: 4, review: 'Me gustó' };

    beforeEach(() => {
        collection = jasmine.createSpyObj<CollectionService>('CollectionService', [
            'updateBookStatus', 'updateAnthologyStatus', 'updateBookRating', 'updateAnthologyRating'
        ]);
        collection.updateBookStatus.and.returnValue(of({}) as never);
        collection.updateAnthologyStatus.and.returnValue(of({}) as never);
        collection.updateBookRating.and.returnValue(of({}) as never);
        collection.updateAnthologyRating.and.returnValue(of({}) as never);
    });

    it('no vuelve a enviar el estado si no cambia, porque crearía otro histórico', () => {
        const requests = collectionStateRequests(collection, book, { ...original, review: 'Me encantó' }, original, false);

        expect(Array.isArray(requests) && requests.length).toBe(1);
        expect(collection.updateBookStatus).not.toHaveBeenCalled();
        expect(collection.updateBookRating).toHaveBeenCalledWith(7, { Puntuacion: 4, Resena: 'Me encantó' });
    });

    it('sin cambios no hay nada que enviar', () => {
        expect(collectionStateRequests(collection, book, { ...original }, original, false)).toEqual([]);
    });

    it('envía el estado nuevo de una obra que aún no estaba en la biblioteca', () => {
        const empty: CollectionStateValues = { status: null, rating: null, review: '' };
        collectionStateRequests(collection, { Tipo: 'antologia', Id: 9 }, { status: 3, rating: null, review: '' }, empty, true);

        expect(collection.updateAnthologyStatus).toHaveBeenCalledWith(9, { EstadoId: 3, PublicarActividad: false });
        expect(collection.updateAnthologyRating).not.toHaveBeenCalled();
    });

    it('no deja vaciar la puntuación de una reseña ya guardada', () => {
        expect(collectionStateRequests(collection, book, { ...original, rating: null }, original, false))
            .toEqual({ error: 'La reseña necesita una puntuación' });
    });
});
