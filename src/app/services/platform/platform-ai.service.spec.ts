import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { PlatformSessionService } from '../auth/platform-session.service';
import {
    PlatformAiModels, PlatformAiService, PlatformAiStatus, defaultTextModel, readyTextProviders, textModelOptions, textModelsError,
    textProviderStates
} from './platform-ai.service';

const precio = { entrada: 1, salida: 5 };

describe('PlatformAiService', () => {
    const base = environment.plataforma.apiUrl.replace(/\/+$/, '');
    let http: HttpTestingController;
    let service: PlatformAiService;

    beforeEach(() => {
        const session = { generation: 1, isCurrentGeneration: () => true, platformToken: async () => 'plataforma' };
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: PlatformSessionService, useValue: session }] });
        http = TestBed.inject(HttpTestingController);
        service = TestBed.inject(PlatformAiService);
    });

    afterEach(() => http.verify());

    it('pregunta el estado y los modelos con el token de la plataforma', fakeAsync(() => {
        service.status().subscribe();
        service.models().subscribe();
        flushMicrotasks();
        const status = http.expectOne(`${base}/v1/ia/estado`);
        const models = http.expectOne(`${base}/v1/ia/modelos`);
        expect(status.request.headers.get('Authorization')).toBe('Bearer plataforma');
        expect(models.request.headers.get('Authorization')).toBe('Bearer plataforma');
        status.flush({ proveedores: [] });
        models.flush({ proveedores: [] });
    }));
});

describe('Modelos de texto para el título', () => {
    const response: PlatformAiModels = {
        proveedores: [
            { proveedor: 'elevenlabs', error: null, modelos: [{ id: 'voz', nombre: 'Voz', usos: ['texto'], precio }] },
            { proveedor: 'openai', error: null, modelos: [
                { id: 'gpt-5.4', nombre: 'GPT-5.4', usos: ['texto'], precio },
                { id: 'gpt-5.4-mini', nombre: 'GPT-5.4 mini', usos: ['texto'], precio },
                { id: 'whisper', nombre: 'Whisper', usos: ['transcripcion'], precio }
            ] },
            {
                proveedor: 'anthropic', error: null, modelos: [
                    { id: 'claude-sonnet-5-5', nombre: 'Claude Sonnet 5.5', usos: ['texto'], precio },
                    { id: 'claude-sin-tarifa', nombre: 'Sin tarifa', usos: ['texto'], precio: null },
                    { id: 'claude-haiku-5-5', nombre: 'Claude Haiku 5.5', usos: ['texto'], precio }
                ]
            }
        ]
    };
    const bothReady: PlatformAiStatus = { proveedores: [{ proveedor: 'anthropic', estado: 'lista' }, { proveedor: 'openai', estado: 'lista' }] };

    it('ofrece los de texto con tarifa de Anthropic y OpenAI listos, con el proveedor en la etiqueta', () => {
        const options = textModelOptions(response, readyTextProviders(bothReady));
        expect(options.map(option => option.label)).toEqual([
            'Claude Sonnet 5.5 · Anthropic', 'Claude Haiku 5.5 · Anthropic', 'GPT-5.4 · OpenAI', 'GPT-5.4 mini · OpenAI'
        ]);
        expect(options[3]).toEqual(jasmine.objectContaining({ key: 'openai:gpt-5.4-mini', id: 'gpt-5.4-mini', proveedor: 'openai' }));
    });

    it('no ofrece los de un proveedor que no está listo', () => {
        const ready = readyTextProviders({ proveedores: [{ proveedor: 'anthropic', estado: 'tope_de_gasto' }, { proveedor: 'openai', estado: 'lista' }] });
        expect(ready).toEqual(['openai']);
        expect(textModelOptions(response, ready).every(option => option.proveedor === 'openai')).toBeTrue();
        expect(textProviderStates({ proveedores: [{ proveedor: 'openai', estado: 'lista' }] })).toEqual(['sin_clave_de_ia', 'lista']);
    });

    it('elige uno ligero del proveedor preferido y, si no está, del otro', () => {
        const options = textModelOptions(response, readyTextProviders(bothReady));
        expect(defaultTextModel(options, 'openai')).toBe('openai:gpt-5.4-mini');
        expect(defaultTextModel(options, 'anthropic')).toBe('anthropic:claude-haiku-5-5');
        expect(defaultTextModel(options.filter(option => option.proveedor === 'anthropic'), 'openai')).toBe('anthropic:claude-haiku-5-5');
        expect(defaultTextModel(options.filter(option => option.id === 'gpt-5.4'), null)).toBe('openai:gpt-5.4');
        expect(defaultTextModel([], 'openai')).toBeNull();
    });

    it('dice por qué no hay modelos', () => {
        expect(textModelsError({ proveedores: [{ proveedor: 'anthropic', error: 'clave_de_ia_rechazada', modelos: [] }] }, ['anthropic'])).toBe('clave_de_ia_rechazada');
    });
});
