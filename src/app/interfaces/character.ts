import { Chapter } from "./chapter";

export interface Character {
    userId: number,
    name: string,
    description: string,
    book_id: number,
    chapters?: Chapter[]
}
