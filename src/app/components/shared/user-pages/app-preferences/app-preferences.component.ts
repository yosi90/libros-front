import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { ProfileChatPreferencesComponent } from '../user-profile/preferences/profile-chat-preferences.component';
import { ProfilePlatformPrivacyComponent } from '../user-profile/preferences/profile-platform-privacy.component';
import { AppearancePreferencesComponent } from './appearance-preferences.component';

type PreferenceSection = 'appearance' | 'privacy' | 'chat';

@Component({
    selector: 'app-app-preferences',
    standalone: true,
    imports: [MatIconModule, ProfileChatPreferencesComponent, ProfilePlatformPrivacyComponent, AppearancePreferencesComponent],
    templateUrl: './app-preferences.component.html',
    styleUrl: './app-preferences.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class AppPreferencesComponent {
    activeSection: PreferenceSection = 'privacy';
    readonly sections: ReadonlyArray<{ id: PreferenceSection; label: string; icon: string; description: string; webOnly?: boolean }> = [
        { id: 'appearance', label: 'Apariencia', icon: 'palette', description: 'Tema de la interfaz en este navegador.', webOnly: true },
        { id: 'privacy', label: 'Privacidad', icon: 'visibility', description: 'Tu privacidad en Libros es la de tu cuenta de Yosiftware.' },
        { id: 'chat', label: 'Chat', icon: 'forum', description: 'Cómo se comportan tus ventanas de chat en este escritorio.' }
    ];

    constructor(
        private presentation: PresentationModeService,
        route: ActivatedRoute
    ) {
        route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
            // Dentro del Perfil el apartado llega en `tab`; en la ruta propia (Mobile), en `section`.
            const section = params.get('tab') ?? params.get('section') ?? params.get('preference');
            if (this.isSection(section) && this.isAvailable(this.section(section))) this.activeSection = section;
        });
    }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }

    get isWebPresentation(): boolean { return this.presentation.snapshot.isWebPresentation; }
    /** Vista Web activa (no solo navegador): claro u oscuro con vista propia. */
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    get activeSectionInfo() { return this.section(this.activeSection); }

    availableSections() { return this.sections.filter(section => this.isAvailable(section)); }
    select(section: PreferenceSection): void { this.activeSection = section; }
    private isSection(value: string | null): value is PreferenceSection {
        return value === 'appearance' || value === 'privacy' || value === 'chat';
    }
    private section(id: PreferenceSection) { return this.sections.find(section => section.id === id)!; }
    private isAvailable(section: { webOnly?: boolean }): boolean {
        return !section.webOnly || this.isWebPresentation;
    }
}
