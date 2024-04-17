import { Chapter } from "./chapter";

export interface Character {
    characterId: number,
    name: string,
    description: string,
    bookId: number,
    chapters?: Chapter[]
}
