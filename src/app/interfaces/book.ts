import { Author } from "./author";
import { BookStatus } from "./book-status";
import { Chapter } from "./chapter";
import { Character } from "./character";
import { Saga } from "./saga";
import { Universe } from "./universe";

export interface Book {
    bookId: number,
    name: string,
    status: BookStatus,
    cover: string,
    userId: number,
    authors: Author[],
    chapters: Chapter[],
    characters: Character[],
    universeId: number,
    universe?: Universe,
    sagaId: number,
    saga?: Saga,
    orderInSaga: number
}
