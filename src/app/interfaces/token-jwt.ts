import { Role } from "./user";

export interface TokenJWT {
    exp: number;
    iat: number;
    sub: string;
    name?: string;
    email?: string;
    image?: string;
    role?: Role;
    Username?: string | null;
    DisplayName?: string | null;
    Bio?: string | null;
    PaisCodigo?: string | null;
    PaisNombre?: string | null;
    PerfilPublico?: boolean;
    MostrarEstadisticas?: boolean;
    MostrarBiblioteca?: boolean;
    PermitirMensajes?: boolean;
    EmailVerificado?: boolean;
    VerificationPending?: boolean;
    EstadoCuenta?: Role | null;
}
