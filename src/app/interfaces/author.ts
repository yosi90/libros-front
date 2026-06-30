export interface Author {
    Id: number;
    Nombre: string;
    Idioma?: string | { Id: number; Codigo?: string | null; Nombre: string } | null;
    IdiomaId?: number | null;
    LugarOrigen?: string | { Id: number; Nombre: string } | null;
    LugarOrigenId?: number | null;
    LugarOrigenNombre?: string | null;
    EstiloEscritura?: Array<{ Id: number; Nombre: string }> | string | null;
}
