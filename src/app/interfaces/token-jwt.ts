export interface TokenJWT {
    exp: number,
    iat: number,
    roles: Rol[],
    sub: string
}

export interface Rol {
    id: number,
    name: string,
}