export interface User {
    userId: number;
    name: string;
    email: string;
    role: Role;
    image: string;
    username?: string | null;
    displayName?: string | null;
    bio?: string | null;
    paisCodigo?: string | null;
    paisNombre?: string | null;
    perfilPublico?: boolean;
    mostrarEstadisticas?: boolean;
    mostrarBiblioteca?: boolean;
    permitirMensajes?: boolean;
    emailVerificado?: boolean;
    verificationPending?: boolean;
    estadoCuenta?: Role | null;
    books?: unknown[];
}

export interface Role {
    Id: number;
    Nombre: string;
}

export interface RecentLibraryActivity {
    Tipo: 'libro' | 'antologia';
    Id: number;
    Nombre: string;
    Autores: {
        Id: number;
        Nombre: string;
    }[];
    Portada: string;
    Estado: {
        Id: number;
        Nombre: string;
        Fecha: string;
    };
}

export interface ApiUserProfile {
    Id: number;
    Nombre: string;
    Email: string;
    Imagen: string;
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
    Role: Role;
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    refresh?: string;
    VerificationPending?: boolean;
    user?: Partial<ApiUserProfile>;
    message?: string;
    EmailChangePending?: boolean;
}

export interface UserProfileUpdate {
    name?: string;
    email?: string;
    image?: string;
    username?: string | null;
    displayName?: string | null;
    bio?: string | null;
    paisCodigo?: string | null;
    paisNombre?: string | null;
    perfilPublico?: boolean;
    mostrarEstadisticas?: boolean;
    mostrarBiblioteca?: boolean;
    permitirMensajes?: boolean;
}
