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