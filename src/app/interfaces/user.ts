import { Author } from "./author";
import { Book } from "./book";
import { Rol } from "./token-jwt";

export interface User {
    userId: number,
    name: string,
    email: string,
    books?: Book[],
    roles?: Rol[],
    authors?: Author[],
    isAdmin?: boolean
}
