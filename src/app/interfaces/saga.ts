import { Author } from "./author";
import { Book } from "./book";

export interface Saga {
    sagaId: number,
    name: string,
    authors: Author[],
    userId: number
    books: Book[]
}
