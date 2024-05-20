import { Author } from "./author";
import { Book } from "./book";
import { Universe } from "./universe";

export interface Saga {
    sagaId: number,
    userId: number,
    name: string,
    authorIds: number[],
    authors: Author[],
    universe: Universe,
    universeId: number,
    bookIds: number[],
    books?: Book[],
}
