import { Author } from "./author";
import { Book } from "./book";
import { Saga } from "./saga";

export interface Universe {
    universeId: Number,
    name: string,
    authors: Author[],
    userId: number,
    sagas?: Saga[],
    books?: Book[]
}
