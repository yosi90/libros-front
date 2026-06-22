export interface RegisterRequest {
    name: string,
    email: string,
    password: string,
    username?: string | null,
    displayName?: string | null,
    paisCodigo?: string | null
}
