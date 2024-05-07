import { Author } from "./author";
import { Book } from "./book";
import { Saga } from "./saga";
import { Rol } from "./token-jwt";
import { Universe } from "./universe";

export interface User {
    userId: number,
    name: string,
    email: string,
    roles?: Rol[],
    isAdmin?: boolean,
    authors?: Author[],
    universes?: Universe[],
    sagas?: Saga[],
    books?: Book[]
}
