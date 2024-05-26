import { Author } from "./author";
import { BookStatus } from "./book-status";
import { Chapter } from "./chapter";
import { Character } from "./character";
import { ReadStatus } from "./read-status";
import { Saga } from "./saga";
import { Universe } from "./universe";

export interface Book {
    bookId: number,
    name: string,
    cover: string,
    userId: number,
    status: ReadStatus[],
    authors: Author[],
    chapters: Chapter[],
    characters: Character[],
    universeId: number,
    universe: Universe,
    sagaId: number,
    sagaName: string,
    saga: Saga,
    orderInSaga: number
}
