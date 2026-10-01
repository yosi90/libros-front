import { Edition } from '../interfaces/catalog';

/** The API already orders editions by its primary-edition rule. */
export function preferredEdition(editions: Edition[], ownedIds: number[] = []): Edition | null {
    return editions.find(edition => ownedIds.includes(edition.Id) || edition.EnMiBiblioteca)
        ?? editions[0]
        ?? null;
}

export function ownedEditionIds(editions: Edition[]): number[] {
    return editions.filter(edition => edition.EnMiBiblioteca).map(edition => edition.Id);
}
