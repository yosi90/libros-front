export interface Author {
    Id: number;
    Nombre: string;
    Idioma?: string | { Id: number; Codigo?: string | null; Nombre: string } | null;
    LugarOrigen?: string | { Id: number; Nombre: string } | null;
    EstiloEscritura?: Array<{ Id: number; Nombre: string }> | string | null;
}
