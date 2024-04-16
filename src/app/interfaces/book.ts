import { Chapter } from "./chapter";
import { Character } from "./character";

export interface Book {
    bookId: number,
    name: string,
    isRead: boolean,
    author: string,
    cover: string,
    ownerId: number,
    chapters?: Chapter[],
    characters?: Character
}
