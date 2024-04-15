import { Character } from "./character";

export interface Chapter {
    chapterId: number,
    name: string,
    order_in_book: number,
    description: string,
    book_id: number,
    characters?: Character[]
}
