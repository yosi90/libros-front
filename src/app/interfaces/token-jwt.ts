import { Role } from "./user";

export interface TokenJWT {
    exp: number;
    iat: number;
    sub: string;
    name: string;
    email: string;
    image: string;
    role: Role;
}