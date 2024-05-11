import { Author } from "./author";
import { Book } from "./book";
import { Role } from "./rol";
import { Saga } from "./saga";
import { Universe } from "./universe";

export interface User {
    userId: number,
    name: string,
    email: string,
    roles?: Role[],
    isAdmin?: boolean,
    authors?: Author[],
    universes?: Universe[],
    sagas?: Saga[],
    books?: Book[]
}
