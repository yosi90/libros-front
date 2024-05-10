import { CharacterT } from "./character-t";

export interface ChapterT {
    name: string,
    description: string,
    orderInBook: number,
    bookId: number,
    charactersId: number[]
}
