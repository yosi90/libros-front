import { Injectable } from '@angular/core';
import { PlatformSessionService } from '../auth/platform-session.service';
import { TranscriptionProvider } from '../platform/platform-ai.service';

export type DictationMode = 'device' | 'ai';

export interface DictationChoice {
    mode: DictationMode;
    model: string | null;
    provider: TranscriptionProvider | null;
}

const DEVICE: DictationChoice = { mode: 'device', model: null, provider: null };

/** Con la IA solo si hay un modelo elegido; si no, el del navegador. */
export function dictatesWithAi(choice: DictationChoice): boolean {
    return choice.mode === 'ai' && !!choice.model && !!choice.provider;
}

/**
 * «Dictado por voz» (IA3): cómo dicta el micrófono del editor, el del navegador o con la clave de IA y qué modelo. Se
 * guarda en este dispositivo, por entorno y cuenta, como las demás preferencias de interfaz.
 */
@Injectable({ providedIn: 'root' })
export class DictationPreferenceService {
    private readonly storagePrefix = 'dictation:v1:';

    constructor(private session: PlatformSessionService) { }

    get choice(): DictationChoice {
        const key = this.session.accountStorageKey(this.storagePrefix);
        if (!key) return DEVICE;
        try {
            const stored = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<DictationChoice> | null;
            if (!stored || (stored.mode !== 'device' && stored.mode !== 'ai')) return DEVICE;
            const provider = stored.provider === 'openai' || stored.provider === 'elevenlabs' ? stored.provider : null;
            return { mode: stored.mode, model: typeof stored.model === 'string' ? stored.model : null, provider };
        } catch {
            return DEVICE;
        }
    }

    save(choice: DictationChoice): void {
        const key = this.session.accountStorageKey(this.storagePrefix);
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify(choice));
        } catch {
            // Sin almacenamiento se dicta con el navegador, la opción por defecto.
        }
    }
}
