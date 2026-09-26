import { Injectable } from '@angular/core';
import { CollectionService } from '../entities/collection.service';
import { BookStoreService } from './book-store.service';
import { UniverseStoreService } from './universe-store.service';

/**
 * Tras editar el catálogo (Administración), la Biblioteca y el último libro
 * abierto conservan en memoria los datos anteriores: páginas, portada,
 * progreso calculado por el servidor… Este servicio los invalida para que la
 * siguiente visita los pida de nuevo.
 */
@Injectable({ providedIn: 'root' })
export class LibrarySyncService {
    constructor(
        private bookStore: BookStoreService,
        private universeStore: UniverseStoreService,
        private collection: CollectionService
    ) { }

    refreshAfterCatalogChange(): void {
        this.bookStore.clear();
        if (!this.universeStore.hasLoadedUniverses())
            return;
        this.collection.getUniverses().subscribe({
            next: universes => this.universeStore.setUniverses(universes),
            // Si falla, la Biblioteca conserva lo que tenía y se actualizará en su próxima carga.
            error: () => undefined
        });
    }
}
