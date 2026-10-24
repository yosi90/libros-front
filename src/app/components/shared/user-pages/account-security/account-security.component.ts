import { A11yModule } from '@angular/cdk/a11y';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { WebAccountSecurityViewComponent } from '../../../web/user/web-account-security-view/web-account-security-view.component';
import { AccountSecuritySection, accountSecuritySections, resolveAccountSecuritySection } from './account-security-sections';
import { MobileAccountSecurityViewComponent } from '../../../mobile/user/mobile-account-security-view/mobile-account-security-view.component';
import { YosiftwareMarkComponent } from '../../common/yosiftware-mark/yosiftware-mark.component';

/**
 * Cuenta y seguridad: todo es de la cuenta de Yosiftware (ecosistema-kit/ACCESO.md, PRIVACIDAD.md y MODERACION.md) y
 * aquí solo se abre o se enlaza, con el símbolo del ecosistema: el perfil (`yosiftware.editarPerfil()`), cambiar de
 * cuenta, la privacidad (`<yosi-privacidad>`), errores y propuestas (`<yosi-reportar>`), las normas, la moderación,
 * los bloqueos y «Tus datos». Las normas, la moderación y los bloqueos propios se retiraron con la adhesión.
 */
@Component({
    standalone: true,
    selector: 'app-account-security',
    imports: [A11yModule, MatButtonModule, MatIconModule, SnackbarModule, MobileAccountSecurityViewComponent, WebAccountSecurityViewComponent, YosiftwareMarkComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './account-security.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './account-security.component.sass'
})
export class AccountSecurityComponent implements OnInit {
    constructor(
        public session: PlatformSessionService,
        private snackBar: SnackbarModule,
        private presentation: PresentationModeService,
        private route: ActivatedRoute
    ) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    readonly sections = accountSecuritySections;
    woodSection: AccountSecuritySection = 'account';

    get accountAlias(): string { return this.session.cuenta?.alias ?? this.session.userName; }
    get accountEmail(): string { return this.session.cuenta?.correo ?? ''; }
    /** «Gestionar tu cuenta» en la web social. */
    get socialAccountUrl(): string { return this.session.socialUrl('cuenta'); }
    /** Las normas de uso y la política de privacidad de la plataforma (se ven sin entrar). */
    get socialRulesUrl(): string { return this.session.socialUrl('normas'); }
    /** Los avisos, sanciones y alegaciones de la cuenta. */
    get socialModerationUrl(): string { return this.session.socialUrl('moderacion'); }
    get socialBlocksUrl(): string { return this.session.socialUrl('bloqueos'); }
    /** «Más… › Cuenta» de la web social: «Tus datos», con «Descargar» y «Borrar» (TUS_DATOS.md). */
    get socialDataUrl(): string { return this.session.socialUrl('cuenta'); }

    editProfile(): void { void this.session.editarPerfil().catch(error => this.notifyError(error, 'No se pudo abrir tu perfil')); }
    switchAccount(): void { void this.session.cambiarCuenta().catch(error => this.notifyError(error, 'No se pudo cambiar de cuenta')); }
    signOut(): void { void this.session.salir().catch(error => this.notifyError(error, 'No se pudo cerrar la sesión')); }
    openPrivacy(): void { void this.session.privacidad().catch(error => this.notifyError(error, 'No se pudo abrir la privacidad')); }
    /** Libros no tiene aún descarga propia: se pide como propuesta, con el formulario de la plataforma. */
    requestLibrosData(): void { void this.session.reportar('propuesta').catch(error => this.notifyError(error, 'No se pudo abrir el formulario')); }

    get woodSectionInfo() { return this.sections.find(section => section.id === this.woodSection)!; }

    selectWoodSection(section: AccountSecuritySection): void {
        this.woodSection = section;
    }

    /** Sin contadores: lo pendiente de la cuenta lo avisa la campana de la plataforma. */
    sectionBadge(_section: AccountSecuritySection): string { return ''; }

    ngOnInit(): void {
        // Dentro del Perfil (Wood) el apartado llega en `tab`; en la ruta propia, en `section`.
        const params = this.route.snapshot.queryParamMap;
        const section = resolveAccountSecuritySection(params.get('tab') ?? params.get('section'));
        if (section) this.woodSection = section;
        if (this.isMobilePresentation && section)
            setTimeout(() => document.getElementById(`account-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    private notifyError(error: unknown, fallback: string): void {
        this.snackBar.openApiError(error, fallback);
    }
}
