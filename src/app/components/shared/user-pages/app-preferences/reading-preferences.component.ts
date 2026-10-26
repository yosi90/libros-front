import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BookScenePreferenceService } from '../../../../services/preferences/book-scene-preference.service';

/**
 * Preferencias de lectura de este dispositivo: la escena del título divertido al abrir un libro. Estructura común; el
 * color lo aporta cada presentación con variables locales, como en Apariencia.
 */
@Component({
    selector: 'app-reading-preferences',
    standalone: true,
    template: `
        <section class="reading">
            <label class="reading__option">
                <input type="checkbox" role="switch" [checked]="sceneEnabled" (change)="toggleScene($any($event.target).checked)">
                <span>
                    <strong>Escena al abrir un libro</strong>
                    <small>Si el libro tiene un título divertido con cabecera, la enseña a pantalla completa unos segundos al entrar. Se guarda en este dispositivo.</small>
                </span>
            </label>
        </section>
    `,
    styles: `
        :host
            display: block
            --reading-ink: #f6e6c9
            --reading-muted: #cdb895
            --reading-surface: rgba(20, 17, 13, .6)
            --reading-border: rgba(218, 166, 91, .28)
            --reading-accent: #e9b66b

        :host-context(html[data-presentation-active='mobile'])
            --reading-ink: var(--mobile-color-ink)
            --reading-muted: var(--mobile-color-ink-muted)
            --reading-surface: var(--mobile-color-surface)
            --reading-border: var(--mobile-color-outline)
            --reading-accent: var(--mobile-color-primary)

        :host-context(html[data-presentation-active='web'])
            --reading-ink: var(--web-color-ink)
            --reading-muted: var(--web-color-ink-muted)
            --reading-surface: var(--web-color-surface)
            --reading-border: var(--web-color-outline)
            --reading-accent: var(--web-color-primary)

        .reading
            color: var(--reading-ink)

        .reading__option
            display: flex
            align-items: flex-start
            gap: 12px
            min-height: 44px
            padding: 12px
            border: 1px solid var(--reading-border)
            border-radius: 12px
            background: var(--reading-surface)
            cursor: pointer

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
                color: var(--reading-muted)
                line-height: 1.4
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReadingPreferencesComponent {
    private readonly scenePreference = inject(BookScenePreferenceService);
    sceneEnabled = this.scenePreference.enabled;

    toggleScene(enabled: boolean): void {
        this.scenePreference.setEnabled(enabled);
        this.sceneEnabled = enabled;
    }
}
