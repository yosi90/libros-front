import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import {
    defaultTranscriptionModel,
    PlatformAiService,
    PlatformAiStatus,
    readyTranscriptionProviders,
    TranscriptionModelOption,
    transcriptionModelOptions
} from '../../../../services/platform/platform-ai.service';
import { DictationChoice, DictationPreferenceService } from '../../../../services/preferences/dictation-preference.service';
import { browserSpeechAvailable } from '../../../../shared/dictation/browser-dictation';

/**
 * «Dictado por voz» (IA3): cómo dicta el micrófono de los editores de escenas y entradas. Con el navegador (gratis, su
 * reconocedor de voz) o con la clave de IA de la persona (OpenAI o ElevenLabs, el modelo que elija, de
 * `GET /v1/ia/modelos`). Se guarda en este dispositivo. Estructura común; el color, el de la sección de lectura.
 */
@Component({
    selector: 'app-dictation-preferences',
    standalone: true,
    template: `
        <section class="dictation" aria-labelledby="dictation-title">
            <h3 id="dictation-title">Dictado por voz</h3>
            <p class="dictation__hint">El micrófono de la barra del editor, en las escenas y las entradas.</p>
            <label class="dictation__option" [class.is-disabled]="!browserAvailable">
                <input type="radio" name="dictation-mode" [checked]="choice.mode === 'device'" [disabled]="!browserAvailable" (change)="chooseDevice()">
                <span>
                    <strong>Del navegador</strong>
                    <small>{{ browserAvailable ? 'Gratis. El reconocedor de voz del navegador escribe cada frase al terminarla.' : 'Este navegador no tiene dictado (Firefox no lo trae). Prueba en Chrome o Edge, o dicta con tu clave de IA.' }}</small>
                </span>
            </label>
            <label class="dictation__option" [class.is-disabled]="!models.length">
                <input type="radio" name="dictation-mode" [checked]="choice.mode === 'ai'" [disabled]="!models.length" (change)="chooseAi()">
                <span>
                    <strong>Con tu clave de IA</strong>
                    <small>{{ aiHint }}</small>
                </span>
            </label>
            @if (choice.mode === 'ai' && models.length) {
                <div class="dictation__models" role="radiogroup" aria-label="Modelo de transcripción">
                    @for (model of models; track model.key) {
                        <label class="dictation__model">
                            <input type="radio" name="dictation-model" [checked]="selectedKey === model.key" (change)="chooseModel(model)">
                            <span>{{ model.label }}</span>
                        </label>
                    }
                </div>
            }
            @if (status && !models.length && status.gestion) {
                <a class="dictation__manage" [href]="status.gestion" target="_blank" rel="noopener">Gestionar tus claves de IA</a>
            }
        </section>
    `,
    styles: `
        :host
            display: block
            margin-top: 16px

        .dictation
            display: grid
            gap: 8px
            color: var(--reading-ink, inherit)

        h3
            margin: 0
            font-size: .95rem

        .dictation__hint
            margin: 0
            color: var(--reading-muted, inherit)
            font-size: .85rem

        .dictation__option
            display: flex
            align-items: flex-start
            gap: 12px
            min-height: 44px
            padding: 12px
            border: 1px solid var(--reading-border, currentColor)
            border-radius: 12px
            background: var(--reading-surface, transparent)
            cursor: pointer

            &.is-disabled
                cursor: default
                opacity: .7

            input
                flex: none
                width: 20px
                height: 20px
                margin: 2px 0 0
                accent-color: var(--reading-accent)

            span
                display: grid
                gap: 4px

            small
                color: var(--reading-muted, inherit)
                line-height: 1.4

        .dictation__models
            display: grid
            gap: 4px
            padding-left: 32px

        .dictation__model
            display: flex
            align-items: center
            gap: 8px
            min-height: 36px
            cursor: pointer

            input
                accent-color: var(--reading-accent)

        .dictation__manage
            color: var(--reading-accent, inherit)
            font-weight: 600
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationPreferencesComponent implements OnInit {
    private readonly preference = inject(DictationPreferenceService);
    private readonly ai = inject(PlatformAiService);
    private readonly changes = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    readonly browserAvailable = browserSpeechAvailable();
    choice: DictationChoice = this.preference.choice;
    status: PlatformAiStatus | null = null;
    models: TranscriptionModelOption[] = [];
    failed = false;

    get selectedKey(): string | null {
        return this.choice.provider && this.choice.model ? `${this.choice.provider}:${this.choice.model}` : null;
    }

    get aiHint(): string {
        if (this.failed) return 'No se ha podido consultar tu IA.';
        if (!this.status) return 'Consultando tu IA…';
        if (!this.models.length) return 'Necesitas una clave de OpenAI o ElevenLabs lista para Libros.';
        return 'Más fino, y con los nombres de tu libro. Gasta de tu clave, dentro de su tope.';
    }

    ngOnInit(): void {
        forkJoin({ status: this.ai.status(), models: this.ai.models() })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ status, models }) => {
                    this.status = status;
                    this.models = transcriptionModelOptions(models, readyTranscriptionProviders(status));
                    this.changes.markForCheck();
                },
                error: () => {
                    this.failed = true;
                    this.changes.markForCheck();
                }
            });
    }

    chooseDevice(): void {
        this.save({ ...this.choice, mode: 'device' });
    }

    chooseAi(): void {
        const current = this.models.find(model => model.key === this.selectedKey);
        const key = current?.key ?? defaultTranscriptionModel(this.models, this.status?.preferidos?.['transcripcion']);
        const model = this.models.find(option => option.key === key) ?? null;
        this.save({ mode: 'ai', model: model?.id ?? null, provider: model?.proveedor ?? null });
    }

    chooseModel(model: TranscriptionModelOption): void {
        this.save({ mode: 'ai', model: model.id, provider: model.proveedor });
    }

    private save(choice: DictationChoice): void {
        this.choice = choice;
        this.preference.save(choice);
        this.changes.markForCheck();
    }
}
