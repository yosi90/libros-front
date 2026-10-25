import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PlatformSessionService } from '../../../../../services/auth/platform-session.service';
import { YosiftwareMarkComponent } from '../../../common/yosiftware-mark/yosiftware-mark.component';

/**
 * La privacidad de Libros es la de la cuenta de Yosiftware (ecosistema-kit/PRIVACIDAD.md): la tecla `<yosi-privacidad>`
 * (ocultar que se usa Libros y qué llega al móvil) y el enlace a todas las webs en la web social. Libros ya no guarda
 * ni perfil público ni «permitir mensajes» propios.
 */
@Component({
    standalone: true,
    selector: 'app-profile-platform-privacy',
    imports: [YosiftwareMarkComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
        <section class="preference-card">
            <p class="preference-hint">Tu privacidad en Libros es la de tu cuenta de Yosiftware: si ocultas que usas Libros y qué te llega al móvil. Tu perfil y quién puede escribirte se deciden en ella.</p>
            <div class="preference-control"><span>Privacidad de Yosiftware en Libros</span><yosi-privacidad></yosi-privacidad></div>
            <a class="preference-secondary" [href]="allWebsUrl" target="_blank" rel="noopener"><app-yosiftware-mark></app-yosiftware-mark>Privacidad de todas tus webs</a>
        </section>
    `,
    styleUrl: './profile-preferences.shared.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePlatformPrivacyComponent {
    constructor(private session: PlatformSessionService) { }

    get allWebsUrl(): string { return this.session.socialUrl('privacidad'); }
}
