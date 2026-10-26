import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { BookFunTitle, BookTitleService } from '../../../../services/entities/book-title.service';
import { PlatformAiModels, PlatformAiService, PlatformAiStatus } from '../../../../services/platform/platform-ai.service';
import { BookTitleState } from './book-title.state';

const precio = { entrada: 1, salida: 5 };
const MODELS: PlatformAiModels = {
    proveedores: [{
        proveedor: 'anthropic', error: null, modelos: [
            { id: 'claude-sonnet-5-5', nombre: 'Claude Sonnet 5.5', usos: ['texto'], precio },
            { id: 'claude-haiku-5-5', nombre: 'Claude Haiku 5.5', usos: ['texto'], precio }
        ]
    }]
};
const READY: PlatformAiStatus = {
    proveedores: [{ proveedor: 'anthropic', estado: 'lista' }, { proveedor: 'openai', estado: 'sin_clave_de_ia' }],
    preferidos: { texto: 'anthropic' }
};

function title(Titulo: string | null, Hoy = 0, Limite = 10, extra: Partial<BookFunTitle> = {}): BookFunTitle {
    return { success: true, Titulo, Generaciones: { Hoy, Limite }, ...extra };
}

function apiError(status: number, code: string, error: string, field?: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: { success: false, code, error, field } });
}

describe('BookTitleState', () => {
    let titles: jasmine.SpyObj<BookTitleService>;
    let ai: { status: jasmine.Spy<() => Observable<PlatformAiStatus>>; models: jasmine.Spy<() => Observable<PlatformAiModels>> };
    let snackBar: jasmine.SpyObj<SnackbarModule>;
    let state: BookTitleState;

    beforeEach(() => {
        titles = jasmine.createSpyObj<BookTitleService>('BookTitleService', ['get', 'save', 'generate']);
        ai = { status: jasmine.createSpy('status').and.returnValue(of(READY)), models: jasmine.createSpy('models').and.returnValue(of(MODELS)) };
        snackBar = jasmine.createSpyObj<SnackbarModule>('SnackbarModule', ['openApiError', 'openSnackBar']);
        TestBed.configureTestingModule({
            providers: [
                { provide: BookTitleService, useValue: titles },
                { provide: PlatformAiService, useValue: ai },
                { provide: SnackbarModule, useValue: snackBar },
                { provide: PlatformSessionService, useValue: { socialUrl: (vista: string) => `https://qa-social.yosiftware.es/?vista=${vista}` } }
            ]
        });
        state = TestBed.runInInjectionContext(() => new BookTitleState());
    });

    it('carga el título con sus generaciones y no repite con el mismo libro', () => {
        titles.get.and.returnValue(of(title('Bailando entre Brumas y Ceniza ⚙️ (¬‿¬)☁️✨', 3, 10)));
        state.load(7);
        state.load(7);

        expect(titles.get).toHaveBeenCalledOnceWith(7);
        expect(state.available).toBeTrue();
        expect(state.title).toBe('Bailando entre Brumas y Ceniza ⚙️ (¬‿¬)☁️✨');
        expect(state.remainingText).toBe('Te quedan 7 hoy');
        expect(state.managementUrl).toBe('https://qa-social.yosiftware.es/?vista=claves-ia');
    });

    it('no enseña el bloque si el libro no está en la colección, y lo reintenta después', () => {
        titles.get.and.returnValue(throwError(() => apiError(404, 'book_not_in_collection', 'Ese libro no está en tu colección.')));
        state.load(7);
        expect(state.available).toBeFalse();

        titles.get.and.returnValue(of(title(null)));
        state.load(7);
        expect(state.available).toBeTrue();
        expect(state.title).toBeNull();
    });

    it('descarta la respuesta del libro anterior', () => {
        const first = new Subject<BookFunTitle>();
        titles.get.and.returnValues(first, of(title('El segundo')));
        state.load(1);
        state.load(2);
        first.next(title('El primero'));

        expect(state.bookId).toBe(2);
        expect(state.title).toBe('El segundo');
    });

    it('guarda a mano, sin la cabecera de la IA, y vacío lo quita', () => {
        titles.get.and.returnValue(of(title('Generado', 1, 10, { Html: '<h1>Generado</h1>', Estilos: 'h1{color:red}' })));
        state.load(7);
        expect(state.html).toBe('<h1>Generado</h1>');

        state.startEditing();
        expect(state.draft).toBe('Generado');
        state.draft = '  Mi frase  ';
        titles.save.and.returnValue(of(title('Mi frase', 1, 10, { Html: null, Estilos: null })));
        state.save();

        expect(titles.save).toHaveBeenCalledWith(7, 'Mi frase');
        expect(state.editing).toBeFalse();
        expect(state.title).toBe('Mi frase');
        expect(state.html).toBeNull();

        state.startEditing();
        state.draft = '   ';
        titles.save.and.returnValue(of(title(null)));
        state.save();
        expect(titles.save).toHaveBeenCalledWith(7, null);
        expect(state.title).toBeNull();
    });

    it('marca el campo con el error del backend y el contador solo cerca del límite', () => {
        titles.get.and.returnValue(of(title(null)));
        state.load(7);
        state.startEditing();
        state.draft = 'a'.repeat(179);
        expect(state.showCounter).toBeFalse();
        state.draft = 'a'.repeat(180);
        expect(state.showCounter).toBeTrue();

        titles.save.and.returnValue(throwError(() => apiError(400, 'invalid_book_title', 'El título no puede pasar de 200 caracteres.', 'Titulo')));
        state.save();
        expect(state.editing).toBeTrue();
        expect(state.editError).toBe('El título no puede pasar de 200 caracteres.');
        expect(snackBar.openApiError).not.toHaveBeenCalled();
    });

    it('comprueba la clave al abrir la generación, elige un Haiku y sustituye la frase al generar', () => {
        titles.get.and.returnValue(of(title('Viejo', 9, 10)));
        state.load(7);
        state.toggleGenerator();

        expect(ai.status).toHaveBeenCalled();
        expect(state.aiProblem).toBe('');
        expect(state.models.map(model => model.label)).toEqual(['Claude Sonnet 5.5 · Anthropic', 'Claude Haiku 5.5 · Anthropic']);
        expect(state.model).toBe('anthropic:claude-haiku-5-5');
        expect(state.canGenerate).toBeTrue();

        titles.generate.and.returnValue(of(title('Nuevo ✨', 10, 10, { Html: '<h1>Nuevo</h1>', Estilos: null })));
        state.generate();

        expect(titles.generate).toHaveBeenCalledOnceWith(7, 'claude-haiku-5-5', 'anthropic');
        expect(state.title).toBe('Nuevo ✨');
        expect(state.html).toBe('<h1>Nuevo</h1>');
        expect(state.limitReached).toBeTrue();
        expect(state.canGenerate).toBeFalse();
        expect(state.limitReachedText).toBe('Ya has generado los 10 títulos de hoy. Mañana podrás generar más.');
    });

    it('sin ninguna clave de texto lista enseña el motivo en lugar de generar', () => {
        ai.status.and.returnValue(of({ proveedores: [{ proveedor: 'anthropic', estado: 'sin_clave_de_ia' }, { proveedor: 'openai', estado: 'sin_clave_de_ia' }] }));
        ai.models.and.returnValue(of({ proveedores: [{ proveedor: 'anthropic', error: 'sin_clave_de_ia', modelos: [] }] }));
        titles.get.and.returnValue(of(title(null)));
        state.load(7);
        state.toggleGenerator();

        expect(state.aiProblem).toBe('Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros.');
        expect(state.canGenerate).toBeFalse();
    });

    it('con el tope agotado en una clave y sin la otra, lo dice el tope', () => {
        ai.status.and.returnValue(of({ proveedores: [{ proveedor: 'anthropic', estado: 'sin_clave_de_ia' }, { proveedor: 'openai', estado: 'tope_de_gasto' }] }));
        titles.get.and.returnValue(of(title(null)));
        state.load(7);
        state.toggleGenerator();
        expect(state.aiProblem).toBe('Tu clave de IA ha llegado a su tope de gasto.');
    });

    it('con OpenAI preferido y listo, sale uno ligero suyo y genera con su proveedor', () => {
        ai.status.and.returnValue(of({ proveedores: [{ proveedor: 'anthropic', estado: 'lista' }, { proveedor: 'openai', estado: 'lista' }], preferidos: { texto: 'openai' } }));
        ai.models.and.returnValue(of({ proveedores: [...MODELS.proveedores, { proveedor: 'openai', error: null, modelos: [
            { id: 'gpt-5.4', nombre: 'GPT-5.4', usos: ['texto'], precio }, { id: 'gpt-5.4-mini', nombre: 'GPT-5.4 mini', usos: ['texto'], precio }
        ] }] }));
        titles.get.and.returnValue(of(title(null)));
        state.load(7);
        state.toggleGenerator();
        expect(state.model).toBe('openai:gpt-5.4-mini');

        titles.generate.and.returnValue(of(title('Nuevo')));
        state.generate();
        expect(titles.generate).toHaveBeenCalledOnceWith(7, 'gpt-5.4-mini', 'openai');
    });

    it('con el tope de gasto agotado lo dice con el enlace a la gestión; con el límite diario, deshabilita', () => {
        titles.get.and.returnValue(of(title(null, 4, 10)));
        state.load(7);
        state.toggleGenerator();

        titles.generate.and.returnValue(throwError(() => apiError(429, 'tope_de_gasto', 'Tu clave de IA ha llegado a su tope de gasto.')));
        state.generate();
        expect(state.generating).toBeFalse();
        expect(state.generateError).toBe('Tu clave de IA ha llegado a su tope de gasto.');
        expect(state.generateErrorNeedsManagement).toBeTrue();

        titles.generate.and.returnValue(throwError(() => apiError(429, 'limite_diario_de_titulos', 'Ya has generado los títulos de hoy.')));
        state.generate();
        expect(state.generateErrorNeedsManagement).toBeFalse();
        expect(state.limitReached).toBeTrue();
        expect(state.canGenerate).toBeFalse();
    });

    it('cerrar el panel de opciones descarta lo que se estaba escribiendo y recoge la generación', () => {
        titles.get.and.returnValue(of(title('Viejo')));
        state.load(7);
        state.openOptions();
        state.startEditing();
        state.draft = 'A medias';
        state.closeOptions();

        expect(state.optionsOpen).toBeFalse();
        expect(state.editing).toBeFalse();
        expect(state.draft).toBe('');
        expect(state.title).toBe('Viejo');

        state.openOptions();
        state.toggleGenerator();
        state.closeOptions();
        expect(state.generatorOpen).toBeFalse();
    });
});
