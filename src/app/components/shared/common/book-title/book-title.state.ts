import { inject } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { BookFunTitle, BookTitleService } from '../../../../services/entities/book-title.service';
import {
    PlatformAiService, TextModelOption, defaultTextModel, readyTextProviders, textModelOptions, textModelsError, textProviderStates
} from '../../../../services/platform/platform-ai.service';
import { getApiErrorCode, getApiErrorMessage } from '../../../../shared/api-error-message';
import { getApiErrorField } from '../../../../shared/backend-field-error';
import { BookTitleFullscreenService } from './book-title-fullscreen.service';

export const BOOK_TITLE_MAX_LENGTH = 200;
/** El contador del campo solo aparece cerca del límite (como el del título del capítulo). */
const COUNTER_FROM = 180;

/** Los errores de la pasarela que se arreglan en «Claves de IA» de la cuenta: llevan el enlace a la gestión. */
const MANAGEMENT_CODES = new Set(['sin_clave_de_ia', 'tope_sin_fijar', 'tope_de_gasto']);

/** Por qué no se puede generar todavía: el `estado` de `/v1/ia/estado` o el `error` de `/v1/ia/modelos`. */
const AI_PROBLEMS: Record<string, string> = {
    sin_clave_de_ia: 'Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros.',
    tope_sin_fijar: 'Tu clave de IA aún no tiene un tope de gasto: fíjalo para poder usarla.',
    tope_de_gasto: 'Tu clave de IA ha llegado a su tope de gasto.',
    clave_de_ia_rechazada: 'El proveedor ha rechazado tu clave de IA.',
    proveedor_sin_respuesta: 'El proveedor de IA no responde ahora mismo. Inténtalo más tarde.',
    claves_ia_no_configuradas: 'Las claves de IA no están disponibles ahora mismo.'
};

/**
 * El título divertido de la persona para un libro de su colección («Bailando entre Brumas y Ceniza ⚙️ (¬‿¬)☁️✨»):
 * lo carga, lo escribe a mano o lo genera con IA con su clave (Anthropic u OpenAI) por la pasarela de la plataforma
 * (ecosistema-kit/CLAVES_DE_IA.md). Solo lo ve su dueño y solo hay en libros, no en antologías ni secciones.
 *
 * Lo crean las fachadas (el resumen del libro y la ficha pública) en su inicializador, para que el borrador sobreviva
 * al cambio de presentación; lo pintan las vistas de cada una. Si el libro no está en la colección (el GET da 404), o
 * falla la carga, el bloque no se enseña.
 */
export class BookTitleState {
    readonly maxLength = BOOK_TITLE_MAX_LENGTH;
    readonly emptyText = 'Aún no tiene título divertido';
    readonly managementText = 'Tus claves de IA y su tope se gestionan en tu cuenta de Yosiftware';

    private readonly titles = inject(BookTitleService);
    private readonly ai = inject(PlatformAiService);
    private readonly snackBar = inject(SnackbarModule);
    private readonly fullscreen = inject(BookTitleFullscreenService);
    readonly managementUrl = inject(PlatformSessionService).socialUrl('claves-ia');

    bookId: number | null = null;
    /** El GET respondió: el libro está en la colección y el bloque se enseña. */
    available = false;
    title: string | null = null;
    /** La cabecera animada del título generado (saneada en el servidor); null en los escritos a mano. */
    html: string | null = null;
    styles: string | null = null;
    used = 0;
    limit = 0;

    editing = false;
    draft = '';
    saving = false;
    editError = '';

    generatorOpen = false;
    checkingAi = false;
    /** Por qué no se puede generar (sin clave, sin tope…): en lugar del botón, con el enlace a la gestión. */
    aiProblem = '';
    /** Los modelos de texto de los proveedores listos; `model` es la `key` del elegido. */
    models: TextModelOption[] = [];
    model: string | null = null;
    generating = false;
    generateError = '';
    generateErrorNeedsManagement = false;

    private loading = false;
    private loadRequest?: Subscription;
    private aiRequest?: Subscription;
    private saveRequest?: Subscription;
    private generateRequest?: Subscription;

    get remaining(): number {
        return Math.max(0, this.limit - this.used);
    }

    get limitReached(): boolean {
        return this.limit > 0 && this.remaining === 0;
    }

    get remainingText(): string {
        return this.remaining === 1 ? 'Te queda 1 hoy' : `Te quedan ${this.remaining} hoy`;
    }

    get limitReachedText(): string {
        return `Ya has generado ${this.limit === 1 ? 'el título de hoy' : `los ${this.limit} títulos de hoy`}. Mañana podrás generar más.`;
    }

    get canGenerate(): boolean {
        return !!this.model && !this.generating && !this.checkingAi && !this.aiProblem && !this.limitReached;
    }

    get showCounter(): boolean {
        return this.draft.length >= COUNTER_FROM;
    }

    /**
     * Lo pide la fachada al abrir la vista de un libro de la colección. Con el mismo libro ya cargado (o cargándose) no
     * repite; tras un fallo, sí (la obra puede haber entrado en la colección entre medias).
     */
    load(bookId: number): void {
        if (this.bookId === bookId && (this.available || this.loading))
            return;
        this.reset();
        this.bookId = bookId;
        this.loading = true;
        this.loadRequest = this.titles.get(bookId).subscribe({
            next: response => {
                this.loading = false;
                this.apply(bookId, response);
            },
            // 404 book_not_in_collection o cualquier otro fallo: sin bloque.
            error: () => { this.loading = false; }
        });
    }

    /** Lo deja como al principio (otro libro, la ficha cerrada o la vista destruida). */
    reset(): void {
        for (const request of [this.loadRequest, this.aiRequest, this.saveRequest, this.generateRequest])
            request?.unsubscribe();
        this.bookId = null;
        this.available = this.loading = false;
        this.title = this.html = this.styles = null;
        this.used = this.limit = 0;
        this.editing = this.saving = this.generatorOpen = this.checkingAi = this.generating = false;
        this.draft = this.editError = this.aiProblem = this.generateError = '';
        this.generateErrorNeedsManagement = false;
        this.models = [];
    }

    startEditing(): void {
        this.editing = true;
        this.generatorOpen = false;
        this.draft = this.title ?? '';
        this.editError = '';
    }

    cancelEditing(): void {
        this.saveRequest?.unsubscribe();
        this.editing = this.saving = false;
        this.draft = this.editError = '';
    }

    save(): void {
        const bookId = this.bookId;
        if (bookId === null || this.saving)
            return;
        const title = this.draft.trim();
        if (title.length > this.maxLength) {
            this.editError = `El título no puede pasar de ${this.maxLength} caracteres.`;
            return;
        }
        this.saving = true;
        this.editError = '';
        this.saveRequest = this.titles.save(bookId, title || null).subscribe({
            next: response => {
                this.apply(bookId, response);
                this.cancelEditing();
            },
            error: error => {
                if (this.bookId !== bookId) return;
                this.saving = false;
                if (getApiErrorCode(error) === 'invalid_book_title' || getApiErrorField(error) === 'Titulo')
                    this.editError = getApiErrorMessage(error, 'Revisa el título.');
                else
                    this.snackBar.openApiError(error, 'No se ha podido guardar el título');
            }
        });
    }

    /** «Ver en grande»: la cabecera a pantalla completa, con su botón de cerrar. */
    openLarge(): void {
        if (this.html && this.title)
            this.fullscreen.open({ title: this.title, html: this.html, styles: this.styles });
    }

    /** Abre la generación y pregunta a la plataforma por las claves de IA y sus modelos; cerrarla la recoge. */
    toggleGenerator(): void {
        if (this.generatorOpen) {
            this.generatorOpen = false;
            return;
        }
        this.generatorOpen = true;
        this.editing = false;
        this.generateError = '';
        this.generateErrorNeedsManagement = false;
        this.checkAi();
    }

    generate(): void {
        const bookId = this.bookId;
        const chosen = this.models.find(option => option.key === this.model);
        if (bookId === null || !chosen || !this.canGenerate)
            return;
        this.generating = true;
        this.generateError = '';
        this.generateErrorNeedsManagement = false;
        this.generateRequest = this.titles.generate(bookId, chosen.id, chosen.proveedor).subscribe({
            next: response => {
                this.apply(bookId, response);
                this.generating = false;
            },
            error: error => {
                if (this.bookId !== bookId) return;
                this.generating = false;
                const code = getApiErrorCode(error) ?? '';
                if (code === 'limite_diario_de_titulos' && this.limit > 0)
                    this.used = this.limit;
                this.generateError = getApiErrorMessage(error, 'No se ha podido generar el título. Inténtalo de nuevo.');
                this.generateErrorNeedsManagement = MANAGEMENT_CODES.has(code);
            }
        });
    }

    private checkAi(): void {
        const bookId = this.bookId;
        this.aiRequest?.unsubscribe();
        this.checkingAi = true;
        this.aiProblem = '';
        this.aiRequest = forkJoin({ status: this.ai.status(), models: this.ai.models() }).subscribe({
            next: ({ status, models }) => {
                if (this.bookId !== bookId) return;
                this.checkingAi = false;
                const ready = readyTextProviders(status);
                const offered = textModelOptions(models, ready);
                if (!ready.length)
                    this.aiProblem = aiProblemText(worstState(textProviderStates(status)));
                else if (!offered.length)
                    this.aiProblem = aiProblemText(textModelsError(models, ready), 'Tu clave de IA no alcanza ningún modelo de texto que Libros pueda usar.');
                this.models = offered;
                if (!offered.some(option => option.key === this.model))
                    this.model = defaultTextModel(offered, status?.preferidos?.['texto']);
            },
            error: () => {
                if (this.bookId !== bookId) return;
                this.checkingAi = false;
                this.aiProblem = 'No se ha podido comprobar tu clave de IA. Inténtalo de nuevo más tarde.';
            }
        });
    }

    private apply(bookId: number, response: BookFunTitle): void {
        if (this.bookId !== bookId)
            return;
        this.available = true;
        this.title = response.Titulo?.trim() || null;
        this.html = this.title ? response.Html?.trim() || null : null;
        this.styles = this.html ? response.Estilos ?? null : null;
        this.used = Math.max(0, Number(response.Generaciones?.Hoy) || 0);
        this.limit = Math.max(0, Number(response.Generaciones?.Limite) || 0);
    }
}

/** Sin ningún proveedor listo, lo que más ayuda a arreglarlo: el tope agotado, luego el tope sin fijar y luego la clave. */
function worstState(states: string[]): string {
    return ['tope_de_gasto', 'tope_sin_fijar'].find(state => states.includes(state)) ?? states.find(state => state !== 'lista') ?? 'sin_clave_de_ia';
}

function aiProblemText(code: string | null | undefined, fallback = 'No se puede usar tu clave de IA ahora mismo.'): string {
    return (code && AI_PROBLEMS[code]) || fallback;
}
