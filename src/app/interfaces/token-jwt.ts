import { Role } from "./rol";

export interface TokenJWT {
    exp: number,
    iat: number,
    roles: Role[],
    sub: string
}