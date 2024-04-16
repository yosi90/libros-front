import { Chapter } from "./chapter";
import { Character } from "./character";

export interface Book {
    bookId: number,
    name: string,
    isRead: boolean,
    author: string,
    cover: string,
    chapters?: Chapter[],
    characters?: Character
}
