export type ActivityCategory = 'estado' | 'puntuacion' | 'resena';

export interface ActivityRecognitions {
    Estado: boolean;
    Puntuacion: boolean;
    Resena: boolean;
}

export interface ActivityPreferences {
    CompartirEstado: boolean;
    CompartirPuntuacion: boolean;
    CompartirResena: boolean;
    Reconocimientos: ActivityRecognitions;
    AudienciaPredeterminada: 'publico' | 'seguidores' | 'amigos';
}
