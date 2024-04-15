import { Book } from "./book";

export interface User {
    userId: number,
    name: string,
    email: string,
    books?: Book[]
}
