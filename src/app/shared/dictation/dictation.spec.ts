import { TestBed } from '@angular/core/testing';
import { PlatformSessionService } from '../../services/auth/platform-session.service';
import {
    defaultTranscriptionModel,
    PlatformAiModels,
    readyTranscriptionProviders,
    transcriptionModelOptions
} from '../../services/platform/platform-ai.service';
import { DictationPreferenceService, dictatesWithAi } from '../../services/preferences/dictation-preference.service';
import { joinDictation } from './join-dictation';

describe('El dictado por voz (IA3)', () => {
    describe('joinDictation', () => {
        it('al empezar una frase va con mayúscula y sin espacio delante', () => {
            expect(joinDictation('', 'vin mira la bruma.')).toBe('Vin mira la bruma.');
            expect(joinDictation('Era tarde.', 'y entonces')).toBe(' Y entonces');
            expect(joinDictation('Era tarde.\n', 'kelsier')).toBe('Kelsier');
            expect(joinDictation('¿Qué? ', 'ríe')).toBe('Ríe');
        });

        it('en mitad de una frase sigue en minúscula con su espacio', () => {
            expect(joinDictation('Vin corría', 'mientras caía la ceniza')).toBe(' mientras caía la ceniza');
            expect(joinDictation('Vin corría ', 'y luego')).toBe('y luego');
        });

        it('sin espacio delante de un signo y nada si no se ha dicho nada', () => {
            expect(joinDictation('Vin', ', dijo')).toBe(', dijo');
            expect(joinDictation('Vin', '   ')).toBe('');
        });
    });

    describe('los modelos de transcripción', () => {
        const response: PlatformAiModels = {
            proveedores: [
                { proveedor: 'openai', modelos: [
                    { id: 'gpt-5.4-mini', nombre: 'GPT-5.4 mini', usos: ['texto'], precio: { entrada: 40 } },
                    { id: 'gpt-4o-transcribe', nombre: 'GPT-4o Transcribe', usos: ['transcripcion'], precio: { minuto: 0.6 } },
                    { id: 'gpt-4o-mini-transcribe', nombre: 'GPT-4o mini Transcribe', usos: ['transcripcion'], precio: { minuto: 0.3 } }
                ] },
                { proveedor: 'elevenlabs', modelos: [
                    { id: 'scribe_v1', nombre: 'Scribe', usos: ['transcripcion'], precio: { minuto: 0.4 } },
                    { id: 'sin-tarifa', nombre: 'Sin tarifa', usos: ['transcripcion'], precio: null }
                ] },
                { proveedor: 'anthropic', modelos: [{ id: 'claude-haiku-5-5', nombre: 'Haiku', usos: ['texto'], precio: { entrada: 50 } }] }
            ]
        };

        it('ofrece los de transcripción con tarifa de OpenAI y ElevenLabs listos, y uno ligero del preferido', () => {
            const ready = readyTranscriptionProviders({ proveedores: [
                { proveedor: 'openai', estado: 'lista' }, { proveedor: 'elevenlabs', estado: 'lista' }, { proveedor: 'anthropic', estado: 'lista' }
            ] });
            expect(ready).toEqual(['openai', 'elevenlabs']);
            const options = transcriptionModelOptions(response, ready);
            expect(options.map(option => option.label)).toEqual(['GPT-4o Transcribe · OpenAI', 'GPT-4o mini Transcribe · OpenAI', 'Scribe · ElevenLabs']);
            expect(defaultTranscriptionModel(options, 'openai')).toBe('openai:gpt-4o-mini-transcribe');
            expect(defaultTranscriptionModel(options, 'elevenlabs')).toBe('elevenlabs:scribe_v1');
            expect(defaultTranscriptionModel([], null)).toBeNull();
        });

        it('sin clave lista no ofrece nada', () => {
            const ready = readyTranscriptionProviders({ proveedores: [{ proveedor: 'openai', estado: 'tope_sin_fijar' }] });
            expect(transcriptionModelOptions(response, ready)).toEqual([]);
        });
    });

    describe('DictationPreferenceService', () => {
        let scope: string | null;
        let service: DictationPreferenceService;
        const keys = ['dictation:v1:qa:cuenta-a', 'dictation:v1:qa:cuenta-b'];

        beforeEach(() => {
            scope = 'qa:cuenta-a';
            TestBed.configureTestingModule({
                providers: [{ provide: PlatformSessionService, useValue: { accountStorageKey: (prefix: string) => scope ? `${prefix}${scope}` : null } }]
            });
            service = TestBed.inject(DictationPreferenceService);
            keys.forEach(key => localStorage.removeItem(key));
        });

        afterEach(() => keys.forEach(key => localStorage.removeItem(key)));

        it('dicta con el navegador por defecto y guarda la elección por cuenta', () => {
            expect(service.choice).toEqual({ mode: 'device', model: null, provider: null });
            service.save({ mode: 'ai', model: 'gpt-4o-mini-transcribe', provider: 'openai' });
            expect(dictatesWithAi(service.choice)).toBeTrue();
            scope = 'qa:cuenta-b';
            expect(service.choice.mode).toBe('device');
        });

        it('lo que no se entiende vuelve al navegador, y con IA hace falta un modelo', () => {
            localStorage.setItem(keys[0], '{"mode":"otro"}');
            expect(service.choice.mode).toBe('device');
            localStorage.setItem(keys[0], '{"mode":"ai","model":"x","provider":"anthropic"}');
            expect(service.choice.provider).toBeNull();
            expect(dictatesWithAi(service.choice)).toBeFalse();
        });
    });
});
