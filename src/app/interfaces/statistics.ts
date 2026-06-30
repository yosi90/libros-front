import { Book } from "./book";
import { Character, CharacterBookMetrics } from "./character";
import { Chapter } from "./chapter";
import { SceneCharacterDetail } from "./scene";

export type MetricValue = number | string | null;
export type MetricObject = Record<string, MetricValue>;

export interface ReadBooksMetric extends MetricObject {
    libros_leidos: number;
}

export interface UnreadBooksMetric extends MetricObject {
    libros_no_leidos: number;
}

export interface ReadAnthologiesMetric extends MetricObject {
    antologias_leidas: number;
}

export interface UnreadAnthologiesMetric extends MetricObject {
    antologias_no_leidas: number;
}

export interface ReadAnthologySectionsMetric extends MetricObject {
    secciones_leidas: number;
}

export interface AverageReadingTimeMetric {
    promedio_dias: number | null;
}

export interface IdNameMetric {
    Id: number;
    Nombre: string;
}

export interface BookStale {
    Id: number;
    Nombre: string;
    FechaUltimoEstado: string;
    DiasSinLeer: number;
}

export interface FastReadDuration {
    Dias: number;
    Horas: number;
}

export interface FastRead {
    Id: number;
    Nombre: string;
    TiempoLectura: FastReadDuration;
    FechaInicio: string;
    FechaLeido: string;
    [key: string]: unknown;
}

export interface MonthlyCount {
    anio: number;
    mes: number;
    cantidad: number;
}

export interface ChapterStatistic {
    Id: number;
    Nombre: string;
    Orden: number;
    Pagina: number;
    PaginaFinal?: number;
    PaginasEstimadas: number | null;
    Escenas: number;
    PersonajesPresentes: number;
    PersonajesNombrados: number;
}

export interface CharacterBookStatistic {
    Id: number;
    Nombre: string;
    Apariciones: number;
    Nombramientos: number;
    Total: number;
    Grupo?: Character["Grupo"];
}

export interface BookStatisticsSnapshot {
    LibroId: number;
    Nombre: string;
    MetricasPersonajes?: CharacterBookMetrics;
    Capitulos: ChapterStatistic[];
    Personajes: CharacterBookStatistic[];
}

export interface GlobalStatisticsSnapshot {
    LibrosLeidos: number;
    LibrosNoLeidos: number;
    AntologiasLeidas: number;
    AntologiasNoLeidas: number;
    SeccionesAntologiaLeidas: number;
    LibroMasRapido: FastRead | null;
    TopLibrosMasRapidos: FastRead[];
    LibroMasTiempoSinLeer: BookStale | null;
    LibrosPorComprar: IdNameMetric[];
    HistorialLectura: MonthlyCount[];
    PromedioDiasCompraLectura: number | null;
}

export function totalReadDays(read: FastRead | null): number | null {
    if (!read?.TiempoLectura) {
        return null;
    }

    return read.TiempoLectura.Dias + read.TiempoLectura.Horas / 24;
}

export function monthlyCountLabel(count: MonthlyCount): string {
    return `${count.mes}/${count.anio}`;
}

export function createBookStatisticsSnapshot(book: Book): BookStatisticsSnapshot {
    const chapters = getAllBookChapters(book);

    return {
        LibroId: book.Id,
        Nombre: book.Nombre,
        MetricasPersonajes: book.MetricasPersonajes,
        Capitulos: chapters.map(createChapterStatistic),
        Personajes: book.Personajes.map(createCharacterStatistic)
    };
}

function getAllBookChapters(book: Book): Chapter[] {
    return [
        ...book.Capitulos,
        ...book.Interludios.flatMap(interlude => interlude.Capitulos ?? [])
    ].sort((current, next) => current.Orden - next.Orden);
}

function createChapterStatistic(chapter: Chapter): ChapterStatistic {
    const sceneCharacters = chapter.Escenas.flatMap(scene => scene.PersonajesDetalle ?? normalizeSceneCharacters(scene.Personajes));
    const chapterCharacters = summarizeChapterCharacters(sceneCharacters);

    return {
        Id: chapter.Id,
        Nombre: chapter.Nombre,
        Orden: chapter.Orden,
        Pagina: chapter.Pagina,
        PaginaFinal: chapter.PaginaFinal,
        PaginasEstimadas: estimateChapterPages(chapter),
        Escenas: chapter.Escenas.length,
        PersonajesPresentes: chapterCharacters.presentes,
        PersonajesNombrados: chapterCharacters.nombrados
    };
}

function summarizeChapterCharacters(characters: SceneCharacterDetail[]): { presentes: number; nombrados: number } {
    const presentCharacters = new Set<number>();
    const mentionedCharacters = new Set<number>();

    characters.forEach(character => {
        if (character.Nombrado) {
            if (!presentCharacters.has(character.Id)) {
                mentionedCharacters.add(character.Id);
            }
            return;
        }

        presentCharacters.add(character.Id);
        mentionedCharacters.delete(character.Id);
    });

    return {
        presentes: presentCharacters.size,
        nombrados: mentionedCharacters.size
    };
}

function estimateChapterPages(chapter: Chapter): number | null {
    if (chapter.PaginaFinal && chapter.Pagina > 0 && chapter.PaginaFinal >= chapter.Pagina) {
        return chapter.PaginaFinal - chapter.Pagina + 1;
    }

    return null;
}

function createCharacterStatistic(character: Character): CharacterBookStatistic {
    const appearances = character.Apariciones ?? character.Capitulos?.filter(chapter => !chapter.Nombrado).length ?? 0;
    const mentions = character.Nombramientos ?? character.CapitulosNombrado?.length ?? 0;

    return {
        Id: character.Id,
        Nombre: character.Nombre,
        Apariciones: appearances,
        Nombramientos: mentions,
        Total: appearances + mentions,
        Grupo: character.Grupo
    };
}

function normalizeSceneCharacters(characters: Chapter["Escenas"][number]["Personajes"]): SceneCharacterDetail[] {
    return characters.map(character => typeof character === "number" ? { Id: character, Nombrado: false } : character);
}
