import { DatePipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { WebAccountSecurityViewComponent } from '../../../web/user/web-account-security-view/web-account-security-view.component';
import { AccountSecuritySection, accountSecuritySections, isAccountSecuritySection } from './account-security-sections';
import { MobileAccountSecurityViewComponent } from '../../../mobile/user/mobile-account-security-view/mobile-account-security-view.component';
import { ModerationAppeal, ModerationIncident, ModerationPolicy, ModerationPolicyKind } from '../../../../interfaces/moderation';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { ModerationAccessService } from '../../../../services/stores/moderation-access.service';
import { getApiErrorCode } from '../../../../shared/api-error-message';
import { renderSafeMarkdown } from '../../../../shared/markdown';
import { CommunityRelationship } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { YosiftwareMarkComponent } from '../../common/yosiftware-mark/yosiftware-mark.component';

@Component({
    standalone: true,
    selector: 'app-account-security',
    imports: [A11yModule, DatePipe, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule, SnackbarModule, MobileAccountSecurityViewComponent, WebAccountSecurityViewComponent, YosiftwareMarkComponent],
    templateUrl: './account-security.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './account-security.component.sass'
})
export class AccountSecurityComponent implements OnInit {
    moderationIncidents: ModerationIncident[] = [];
    moderationAppeals: ModerationAppeal[] = [];
    isModerationLoading = true;
    appealDrafts: Record<number, string> = {};
    isSubmittingAppeal = false;
    policies: ModerationPolicy[] = [];
    isPoliciesLoading = true;
    policiesLoadError = false;
    acceptingPolicy: ModerationPolicyKind | null = null;
    blockedProfiles: CommunityRelationship[] = [];
    blockedProfilesNextAfterId: number | null = null;
    areBlockedProfilesLoading = true;
    isLoadingMoreBlockedProfiles = false;
    blockedProfilesError = '';
    blockedProfileActionId: number | null = null;
    moderationSurfaceOpen = false;
    blockedProfilesSurfaceOpen = false;
    selectedPolicy: ModerationPolicy | null = null;

    constructor(
        public session: PlatformSessionService,
        private snackBar: SnackbarModule,
        private presentation: PresentationModeService,
        private moderation: ModerationService,
        private moderationAccess: ModerationAccessService,
        private route: ActivatedRoute,
        private community: CommunityService
    ) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    readonly sections = accountSecuritySections;
    woodSection: AccountSecuritySection = 'account';

    /**
     * Entrar, la contraseña, el correo, los métodos de acceso y los dispositivos son de la cuenta de Yosiftware
     * (ecosistema-kit/ACCESO.md): aquí solo se enlazan. Normas, moderación y bloqueos pasan a la plataforma en el
     * hito 3 del roadmap del ecosistema.
     */
    get accountAlias(): string { return this.session.cuenta?.alias ?? this.session.userName; }
    get accountEmail(): string { return this.session.cuenta?.correo ?? ''; }
    get socialAccountUrl(): string { return this.session.socialUrl('cuenta'); }

    editProfile(): void { void this.session.editarPerfil().catch(error => this.notifyError(error, 'No se pudo abrir tu perfil')); }
    switchAccount(): void { void this.session.cambiarCuenta().catch(error => this.notifyError(error, 'No se pudo cambiar de cuenta')); }
    signOut(): void { void this.session.salir().catch(error => this.notifyError(error, 'No se pudo cerrar la sesión')); }

    get woodSectionInfo() { return this.sections.find(section => section.id === this.woodSection)!; }

    selectWoodSection(section: AccountSecuritySection): void {
        this.woodSection = section;
    }

    sectionBadge(section: AccountSecuritySection): string {
        if (section === 'policies') {
            const pending = this.policies.filter(policy => !policy.Aceptada).length;
            return pending ? String(pending) : '';
        }
        if (section === 'moderation') return this.moderationItemsCount ? String(this.moderationItemsCount) : '';
        return '';
    }

    get moderationItemsCount(): number { return this.moderationIncidents.length + this.moderationAppeals.length; }
    get blockedProfilesCountLabel(): string { return `${this.blockedProfiles.length}${this.blockedProfilesNextAfterId ? '+' : ''}`; }

    ngOnInit(): void {
        this.loadPolicies();
        this.loadModeration();
        this.loadBlockedProfiles();
        const params = this.route.snapshot.queryParamMap;
        const section = params.get('section');
        if (this.isMobilePresentation && section === 'moderation') this.openModerationSurface();
        else if (this.isMobilePresentation && section === 'blocks') this.openBlockedProfilesSurface();
        else if (this.isMobilePresentation && section === 'policies')
            setTimeout(() => document.getElementById(`account-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        // Dentro del Perfil (Wood) el apartado llega en `tab`.
        const tab = params.get('tab') ?? section;
        if (isAccountSecuritySection(tab)) this.woodSection = tab;
    }

    @HostListener('document:keydown.escape')
    closeSurfaceWithEscape(): void {
        if (this.selectedPolicy) this.closePolicySurface();
        else if (this.blockedProfilesSurfaceOpen) this.closeBlockedProfilesSurface();
        else if (this.moderationSurfaceOpen) this.closeModerationSurface();
    }

    loadPolicies(): void {
        this.isPoliciesLoading = true;
        this.policiesLoadError = false;
        forkJoin((['uso', 'creacion'] as ModerationPolicyKind[]).map(kind => this.moderation.getActivePolicy(kind).pipe(
            map(policy => ({ policy, error: false })),
            catchError(error => of({ policy: null, error: getApiErrorCode(error) !== 'active_policy_not_found' }))
        ))).subscribe(results => {
            this.policies = results.flatMap(result => result.policy ? [result.policy] : []);
            this.policiesLoadError = results.some(result => result.error);
            this.isPoliciesLoading = false;
        });
    }

    acceptPolicy(kind: ModerationPolicyKind): void {
        if (this.acceptingPolicy) return;
        this.acceptingPolicy = kind;
        this.moderation.acceptPolicy(kind).subscribe({
            next: () => {
                this.moderationAccess.refresh().subscribe();
                if (this.selectedPolicy?.Tipo === kind) this.closePolicySurface();
                this.loadPolicies();
                this.acceptingPolicy = null;
                this.snackBar.openSnackBar('Norma aceptada correctamente', 'successBar');
            },
            error: error => {
                this.acceptingPolicy = null;
                this.notifyError(error, 'No se ha podido registrar la aceptación');
            }
        });
    }

    renderPolicyMarkdown(markdown: string): string { return renderSafeMarkdown(markdown); }
    policyLabel(kind: ModerationPolicyKind): string { return kind === 'uso' ? 'Normas de uso' : 'Normas de creación'; }

    loadModeration(): void {
        this.isModerationLoading = true;
        this.moderation.listOwnIncidents({ limit: 50 }).subscribe({
            next: incidents => {
                this.moderationIncidents = incidents.items;
                this.moderation.listOwnAppeals().subscribe({
                    next: appeals => { this.moderationAppeals = appeals; this.isModerationLoading = false; },
                    error: () => this.isModerationLoading = false
                });
            },
            error: () => this.isModerationLoading = false
        });
    }

    hasAppeal(sanctionId: number): boolean { return this.moderationAppeals.some(appeal => appeal.SancionId === sanctionId); }

    submitAppeal(incident: ModerationIncident): void {
        const sanctionId = incident.Sancion.Id;
        const text = (this.appealDrafts[sanctionId] || '').trim();
        if (!sanctionId || incident.Sancion.Estado === 'none' || !text || this.isSubmittingAppeal) return;
        this.isSubmittingAppeal = true;
        this.moderation.createAppeal(sanctionId, text).subscribe({
            next: () => {
                delete this.appealDrafts[sanctionId];
                this.isSubmittingAppeal = false;
                this.snackBar.openSnackBar('Alegación enviada', 'successBar');
                this.loadModeration();
            },
            error: error => {
                this.isSubmittingAppeal = false;
                this.notifyError(error, 'No se ha podido enviar la alegación');
            }
        });
    }

    moderationStatusLabel(status: string): string {
        const labels: Record<string, string> = { none: 'Sin sanción', banned: 'Cuenta suspendida', blocked: 'Bloqueada', sanctioned: 'Sancionada', revoked: 'Revocada', pendiente: 'Pendiente', en_revision: 'En revisión', aceptada: 'Aceptada', rechazada: 'Rechazada' };
        return labels[status] ?? status;
    }

    loadBlockedProfiles(afterId?: number): void {
        if (afterId) this.isLoadingMoreBlockedProfiles = true;
        else this.areBlockedProfilesLoading = true;
        this.blockedProfilesError = '';
        this.community.relationships('bloqueos', afterId).subscribe({
            next: page => {
                this.blockedProfiles = afterId
                    ? [...this.blockedProfiles, ...page.Relaciones.filter(incoming => !this.blockedProfiles.some(current => current.Usuario.Id === incoming.Usuario.Id))]
                    : page.Relaciones;
                this.blockedProfilesNextAfterId = page.SiguienteAfterId;
                this.areBlockedProfilesLoading = false;
                this.isLoadingMoreBlockedProfiles = false;
            },
            error: error => {
                this.blockedProfilesError = getApiErrorMessage(error, 'No se pudieron cargar los perfiles bloqueados');
                this.areBlockedProfilesLoading = false;
                this.isLoadingMoreBlockedProfiles = false;
            }
        });
    }

    unblockProfile(relationship: CommunityRelationship): void {
        const user = relationship.Usuario;
        if (this.blockedProfileActionId !== null || !confirm(`¿Quieres desbloquear a ${user.Nombre}?`)) return;
        this.blockedProfileActionId = user.Id;
        this.community.unblockUser(user.Id).subscribe({
            next: () => {
                this.blockedProfiles = this.blockedProfiles.filter(item => item.Usuario.Id !== user.Id);
                this.blockedProfileActionId = null;
                this.snackBar.openSnackBar(`${user.Nombre} ya no está bloqueado`, 'successBar');
            },
            error: error => {
                this.blockedProfileActionId = null;
                this.notifyError(error, 'No se pudo desbloquear este perfil');
            }
        });
    }

    openModerationSurface(): void { this.moderationSurfaceOpen = true; }
    closeModerationSurface(): void { this.moderationSurfaceOpen = false; }
    openBlockedProfilesSurface(): void { this.blockedProfilesSurfaceOpen = true; }
    closeBlockedProfilesSurface(): void { this.blockedProfilesSurfaceOpen = false; }
    openPolicySurface(policy: ModerationPolicy): void { this.selectedPolicy = policy; }
    closePolicySurface(): void { this.selectedPolicy = null; }

    private notifyError(error: unknown, fallback: string): void { this.snackBar.openApiError(error, fallback); }
}
