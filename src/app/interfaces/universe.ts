import { Author } from "./author";
import { Book } from "./book";
import { Saga } from "./saga";

export interface Universe {
    universeId: number,
    name: string,
    authorIds: number[],
    authors: Author[],
    userId: number,
    sagaIds: number[],
    sagas: Saga[],
    bookIds: number[],
    books?: Book[]
}
