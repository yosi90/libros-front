import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformApiService } from './platform-api.service';

/** Un modelo que alcanza la clave de la persona (`GET /v1/ia/modelos`). `precio` en null: no está en la tabla. */
export interface PlatformAiModel {
    id: string;
    nombre: string;
    usos?: string[] | null;
    precio?: Record<string, unknown> | null;
}

export interface PlatformAiModels {
    proveedores: Array<{ proveedor: string; error?: string | null; modelos?: PlatformAiModel[] | null }>;
}

/** `estado` es `lista` o el `code` que daría la pasarela: `sin_clave_de_ia`, `tope_sin_fijar` o `tope_de_gasto`. */
export interface PlatformAiStatus {
    proveedores: Array<{ proveedor: string; estado: string }>;
    preferidos?: Record<string, string | null> | null;
    gestion?: string | null;
}

/** El ligero de Anthropic que se ofrece primero si la clave lo alcanza. */
export const PREFERRED_ANTHROPIC_MODEL = 'claude-haiku-5-5';

/**
 * Lo que la plataforma dice de las claves de IA de la persona (ecosistema-kit/CLAVES_DE_IA.md, «Saber antes de llamar»
 * y «Elegir el modelo»), con el token de la plataforma. No se llama a ningún proveedor ni se sabe nada de la clave; se
 * pregunta cerca de cuando se va a usar y no se guarda.
 */
@Injectable({ providedIn: 'root' })
export class PlatformAiService {

    constructor(private api: PlatformApiService) { }

    models(): Observable<PlatformAiModels> {
        return this.api.get<PlatformAiModels>('/v1/ia/modelos');
    }

    status(): Observable<PlatformAiStatus> {
        return this.api.get<PlatformAiStatus>('/v1/ia/estado');
    }
}

/** Los proveedores de texto que Libros puede usar para el título, en su orden y con su nombre visible. */
export const TEXT_PROVIDERS = { anthropic: 'Anthropic', openai: 'OpenAI' } as const;
export type TextProvider = keyof typeof TEXT_PROVIDERS;

/** Un modelo que se puede elegir: `key` distingue el mismo id en dos proveedores. */
export interface TextModelOption {
    key: string;
    id: string;
    proveedor: TextProvider;
    /** «Claude Haiku 5.5 · Anthropic». */
    label: string;
}

/** Los que pasan audio a texto (el dictado, IA3), en su orden y con su nombre visible. */
export const TRANSCRIPTION_PROVIDERS = { openai: 'OpenAI', elevenlabs: 'ElevenLabs' } as const;
export type TranscriptionProvider = keyof typeof TRANSCRIPTION_PROVIDERS;

export interface TranscriptionModelOption {
    key: string;
    id: string;
    proveedor: TranscriptionProvider;
    /** «GPT-4o mini Transcribe · OpenAI». */
    label: string;
}

/** Los proveedores de `names` listos (`estado: lista`) en `/v1/ia/estado`, en su orden. */
function readyProviders<P extends string>(status: PlatformAiStatus | null | undefined, names: Record<P, string>): P[] {
    return (Object.keys(names) as P[]).filter(provider =>
        status?.proveedores?.some(item => item.proveedor === provider && item.estado === 'lista'));
}

/** Los modelos con tarifa de `use` de los proveedores `ready` (sin `precio`, con tope la llamada daría `modelo_sin_tarifa`). */
function modelOptions<P extends string>(response: PlatformAiModels | null | undefined, ready: readonly P[], use: string,
    names: Record<P, string>): Array<{ key: string; id: string; proveedor: P; label: string }> {
    return ready.flatMap(provider => (response?.proveedores?.find(item => item.proveedor === provider)?.modelos ?? [])
        .filter(model => !!model?.id && (model.usos ?? []).includes(use) && model.precio !== null && model.precio !== undefined)
        .map(model => ({ key: `${provider}:${model.id}`, id: model.id, proveedor: provider, label: `${model.nombre || model.id} · ${names[provider]}` })));
}

/** Los proveedores de texto listos (`estado: lista`) en `/v1/ia/estado`. */
export function readyTextProviders(status: PlatformAiStatus | null | undefined): TextProvider[] {
    return readyProviders(status, TEXT_PROVIDERS);
}

/** Los proveedores de transcripción listos. */
export function readyTranscriptionProviders(status: PlatformAiStatus | null | undefined): TranscriptionProvider[] {
    return readyProviders(status, TRANSCRIPTION_PROVIDERS);
}

/** Los modelos de transcripción con tarifa de los proveedores listos, en el orden de `TRANSCRIPTION_PROVIDERS`. */
export function transcriptionModelOptions(response: PlatformAiModels | null | undefined,
    ready: readonly TranscriptionProvider[]): TranscriptionModelOption[] {
    return modelOptions(response, ready, 'transcripcion', TRANSCRIPTION_PROVIDERS);
}

/** El de transcripción que sale elegido: del preferido si está listo, uno ligero («mini») o su primero. */
export function defaultTranscriptionModel(options: TranscriptionModelOption[], preferred: string | null | undefined): string | null {
    const own = options.filter(option => option.proveedor === preferred);
    const candidates = own.length ? own : options;
    return (candidates.find(option => /mini/i.test(option.id)) ?? candidates[0])?.key ?? null;
}

/** El estado de cada proveedor de texto; sin dato, como si no hubiera clave. */
export function textProviderStates(status: PlatformAiStatus | null | undefined): string[] {
    return (Object.keys(TEXT_PROVIDERS) as TextProvider[]).map(provider =>
        status?.proveedores?.find(item => item.proveedor === provider)?.estado ?? 'sin_clave_de_ia');
}

/**
 * Los modelos de texto con tarifa de los proveedores listos (sin `precio`, con tope la llamada daría
 * `modelo_sin_tarifa`), en el orden de `TEXT_PROVIDERS`.
 */
export function textModelOptions(response: PlatformAiModels | null | undefined, ready: readonly TextProvider[]): TextModelOption[] {
    return modelOptions(response, ready, 'texto', TEXT_PROVIDERS);
}

/** Por qué no hay lista de modelos (`error` del proveedor) en el primero de los listos que lo diga. */
export function textModelsError(response: PlatformAiModels | null | undefined, ready: readonly TextProvider[]): string | null {
    for (const provider of ready) {
        const error = response?.proveedores?.find(item => item.proveedor === provider)?.error;
        if (error) return error;
    }
    return null;
}

/**
 * El que sale elegido (CLAVES_DE_IA.md, «El proveedor preferido»): del preferido para `texto` si está listo, uno ligero
 * (un id con «haiku» o «mini») o su primero; si no, igual en el primer otro proveedor que tenga modelos.
 */
export function defaultTextModel(options: TextModelOption[], preferred: string | null | undefined): string | null {
    const providers = [...new Set(options.map(option => option.proveedor))]
        .sort((left, right) => Number(right === preferred) - Number(left === preferred));
    for (const provider of providers) {
        const own = options.filter(option => option.proveedor === provider);
        const chosen = own.find(option => option.id === PREFERRED_ANTHROPIC_MODEL)
            ?? own.find(option => /haiku|mini/i.test(option.id))
            ?? own[0];
        if (chosen) return chosen.key;
    }
    return null;
}
