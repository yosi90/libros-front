export interface User {
    userId: number;
    name: string;
    email: string;
    role: Role;
    image: string;
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
