import { Book } from "./book";
import { Saga } from "./saga";
import { Universe } from "./universe";

export interface Author {
    authorId: number,
    name: string,
    userId: number,
    universes?: Universe[],
    sagas?: Saga[],
    books?: Book[]
}
