import { Author } from "./author";
import { Chapter } from "./chapter";
import { Character } from "./character";

export interface Book {
    bookId: number,
    name: string,
    read: boolean,
    cover: string,
    ownerId: number,
    authors: Author[],
    chapters: Chapter[],
    characters: Character[]
}
