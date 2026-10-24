import { Injectable } from '@angular/core';
import { Observable, defer, from } from 'rxjs';
import { ChatFloatingPreferences, ChatFloatingPreferencesPatch, ChatFloatWindow } from '../../interfaces/chat';
import { PlatformSessionService } from '../auth/platform-session.service';
import { AjustesPlataforma } from '../auth/yosiftware-sdk';

/** La clave del bloque de ajustes de Libros en la que viven las ventanas flotantes del chat. */
export const CHAT_FLOATING_SETTINGS_KEY = 'chatFlotante';
const MAX_WINDOWS = 5;

/** El SDK rechaza el `guardar` con versión si otro dispositivo guardó entre medias. */
function isSettingsConflict(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === 'ajustes_desactualizados';
}

export function defaultChatFloatingPreferences(version = 0): ChatFloatingPreferences {
    return {
        VersionShape: 1,
        Version: version,
        FechaActualizacion: null,
        AutoabrirListado: false,
        PermitirBurbujas: true,
        ModoListado: 'normal',
        PosicionListado: null,
        TamanoListado: null,
        ConversacionesFlotantes: []
    };
}

function finite(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function position(value: unknown): { x?: number; y?: number } | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, unknown>;
    return { x: finite(item['x']), y: finite(item['y']) };
}

function size(value: unknown): { ancho?: number; alto?: number } | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, unknown>;
    return { ancho: finite(item['ancho']), alto: finite(item['alto']) };
}

/** Lo guardado en la cuenta, validado: lo que no encaja se ignora y se usan los valores de siempre. */
export function normalizeChatFloatingPreferences(value: unknown, version: number): ChatFloatingPreferences {
    const base = defaultChatFloatingPreferences(version);
    if (!value || typeof value !== 'object') return base;
    const stored = value as Record<string, unknown>;
    const windows = Array.isArray(stored['ConversacionesFlotantes']) ? stored['ConversacionesFlotantes'] as unknown[] : [];
    return {
        ...base,
        FechaActualizacion: typeof stored['FechaActualizacion'] === 'string' ? stored['FechaActualizacion'] : null,
        AutoabrirListado: stored['AutoabrirListado'] === true,
        PermitirBurbujas: stored['PermitirBurbujas'] !== false,
        ModoListado: stored['ModoListado'] === 'minimizado' ? 'minimizado' : 'normal',
        PosicionListado: position(stored['PosicionListado']),
        TamanoListado: size(stored['TamanoListado']),
        ConversacionesFlotantes: windows.flatMap((item): ChatFloatWindow[] => {
            if (!item || typeof item !== 'object') return [];
            const window = item as Record<string, unknown>;
            const id = window['ConversacionId'];
            if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) return [];
            return [{ ConversacionId: id, Modo: window['Modo'] === 'minimizado' ? 'minimizado' : 'normal', Posicion: position(window['Posicion']), Tamano: size(window['Tamano']) }];
        }).slice(0, MAX_WINDOWS)
    };
}

function persisted(preferences: ChatFloatingPreferences): Record<string, unknown> {
    const { Version: _version, ...rest } = preferences;
    return rest;
}

/**
 * Cómo deja cada persona las ventanas flotantes del chat (si el listado se abre solo, las burbujas, dónde quedan) se
 * guarda en el bloque de ajustes de Libros de su cuenta (`yosiftware.ajustes`, ecosistema-kit/ACCESO.md, «Los ajustes
 * de la web»). La API de Libros ya no guarda nada del chat. Lo que llega de otra cuenta se descarta.
 */
@Injectable({ providedIn: 'root' })
export class ChatFloatingSettingsService {
    constructor(private session: PlatformSessionService) { }

    load(): Observable<ChatFloatingPreferences> {
        return defer(() => from(this.read()));
    }

    /** Aplica los cambios sobre lo último guardado (también desde otro dispositivo) y devuelve el resultado. */
    save(patch: ChatFloatingPreferencesPatch): Observable<ChatFloatingPreferences> {
        return defer(() => from(this.write(patch, 1)));
    }

    private async read(): Promise<ChatFloatingPreferences> {
        const generation = this.session.generation;
        const sdk = await this.session.platformSdk();
        const block = await sdk.ajustes.leer();
        this.assertGeneration(generation);
        return this.fromBlock(block);
    }

    private async write(patch: ChatFloatingPreferencesPatch, retries: number): Promise<ChatFloatingPreferences> {
        const generation = this.session.generation;
        const sdk = await this.session.platformSdk();
        const block = await sdk.ajustes.leer();
        this.assertGeneration(generation);
        const current = this.fromBlock(block);
        const next: ChatFloatingPreferences = { ...current, ...patch, FechaActualizacion: new Date().toISOString() };
        try {
            const saved = await sdk.ajustes.guardar({ [CHAT_FLOATING_SETTINGS_KEY]: persisted(next) }, block?.version ?? 0);
            this.assertGeneration(generation);
            return this.fromBlock(saved);
        } catch (error) {
            this.assertGeneration(generation);
            if (retries > 0 && isSettingsConflict(error)) return this.write(patch, retries - 1);
            throw error;
        }
    }

    private fromBlock(block: AjustesPlataforma | null): ChatFloatingPreferences {
        if (!block) throw { code: 'sin_sesion' };
        return normalizeChatFloatingPreferences(block.documento?.[CHAT_FLOATING_SETTINGS_KEY], block.version ?? 0);
    }

    private assertGeneration(generation: number): void {
        if (!this.session.isCurrentGeneration(generation)) throw { code: 'cambio_de_cuenta' };
    }
}
