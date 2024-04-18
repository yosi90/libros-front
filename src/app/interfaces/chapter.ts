import { Character } from "./character";

export interface Chapter {
    chapterId: number,
    name: string,
    orderInBook: number,
    description: string,
    book_id: number,
    characters?: Character[]
}
