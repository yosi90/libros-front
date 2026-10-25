import { AccountSecurityComponent } from '../account-security/account-security.component';
import { AppPreferencesComponent } from '../app-preferences/app-preferences.component';
import { WebProfileViewComponent } from '../../../web/user/web-profile-view/web-profile-view.component';
import { CatalogRequestField, catalogEntityLabel, catalogRequestActionLabel, catalogRequestPayloadFields } from '../../../../shared/catalog-request-labels';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { ApiUserProfile, RecentLibraryActivity, User } from '../../../../interfaces/user';
import { YosiftwareMarkComponent } from '../../common/yosiftware-mark/yosiftware-mark.component';
import { catchError, of } from 'rxjs';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { UserService } from '../../../../services/entities/user.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ObjectManagerComponent } from '../object-manager/object-manager.component';
import { ManagerKind } from '../object-manager/object-manager.models';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Universe, UniverseMetricsResponse } from '../../../../interfaces/universe';
import { Saga } from '../../../../interfaces/saga';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { Author } from '../../../../interfaces/author';
import { BookSimple } from '../../../../interfaces/book';
import { Antology } from '../../../../interfaces/antology';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { CatalogRequest, ReportGroup } from '../../../../interfaces/catalog';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { ReportService } from '../../../../services/entities/report.service';
import { UniverseService } from '../../../../services/entities/universe.service';
import { ProfileUniverseMetricsComponent } from './profile-universe-metrics/profile-universe-metrics.component';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileProfileViewComponent } from '../../../mobile/user/mobile-profile-view/mobile-profile-view.component';
import { getStatusIcon } from '../../../../shared/reading-status';

type ProfileSection = 'overview' | 'profile' | 'requests' | 'reports' | 'security' | 'preferences' | ManagerKind;

interface DisplayField {
    label: string;
    value: string;
}

@Component({
    standalone: true,
    selector:  'app-user-profile',
    imports: [MatCardModule, FormsModule, MatButtonModule, MatIconModule, CommonModule, SnackbarModule,
        MatTooltipModule, RouterLink, CoverCachePipe, ObjectManagerComponent, ProfileUniverseMetricsComponent, MobileProfileViewComponent, WebProfileViewComponent, AccountSecurityComponent, AppPreferencesComponent, YosiftwareMarkComponent],
    templateUrl: './user-profile.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './user-profile.component.sass'
})
export class UserProfileComponent implements OnInit {
    // Listados propios: en Wood y Web se alcanzan desde el Perfil, no desde la navegación principal.
    readonly libraryLinks: ReadonlyArray<{ section: ManagerKind; icon: string; label: string }> = [
        { section: 'authors', icon: 'groups', label: 'Autores' },
        { section: 'universes', icon: 'public', label: 'Universos' },
        { section: 'sagas', icon: 'bookmark', label: 'Sagas' },
        { section: 'books', icon: 'auto_stories', label: 'Libros' },
        { section: 'anthologies', icon: 'collections_bookmark', label: 'Antologías' }
    ];

    // Cuenta y Preferencias viven dentro del Perfil en Wood y Web; la APK conserva sus pantallas.
    readonly accountLinks: ReadonlyArray<{ section: 'security' | 'preferences'; icon: string; label: string }> = [
        { section: 'security', icon: 'shield', label: 'Cuenta y seguridad' },
        { section: 'preferences', icon: 'settings', label: 'Preferencias' }
    ];

    get activeManagerKind(): ManagerKind | null {
        return this.libraryLinks.some(link => link.section === this.activeSection) ? this.activeSection as ManagerKind : null;
    }

    userData!: User;
    universes: Universe[] = [];
    sagas: Saga[] = [];
    authors: Author[] = [];
    books: BookSimple[] = [];
    antologies: Antology[] = [];

    recentActivity: RecentLibraryActivity[] = [];
    isRecentActivityLoading = true;
    accountProfile: ApiUserProfile | null = null;
    isAccountProfileLoading = true;
    universeMetrics: UniverseMetricsResponse | null = null;
    areUniverseMetricsLoading = true;
    universeMetricsLoadError = false;
    activeSection: ProfileSection = 'overview';
    myRequests: CatalogRequest[] = [];
    myReports: ReportGroup[] = [];
    areRequestsLoading = true;
    areReportsLoading = true;
    requestResponses: Record<number, string> = {};
    isRespondingRequest = false;
    /** Apartado interno de Seguridad o Preferencias (`?tab=`) al abrirlos dentro del Perfil. */
    activeTab: string | null = null;
    constructor(private sessionSrv: PlatformSessionService, private userSrv: UserService, private _snackBar: SnackbarModule, private loader: LoaderEmmitterService,
        private universeStore: UniverseStoreService, private universeSrv: UniverseService, private catalogRequestSrv: CatalogRequestService, private reportSrv: ReportService, private route: ActivatedRoute, private presentation: PresentationModeService) {
        this.route.queryParamMap
            .pipe(takeUntilDestroyed())
            .subscribe(params => {
                const requestedSection = params.get('section');
                if (this.isProfileSection(requestedSection)) {
                    this.activeSection = requestedSection;
                }
                this.activeTab = params.get('tab');
            });
    }

    ngOnInit(): void {
        this.loader.activateLoader();
        const user = this.sessionSrv.userObject;
        this.userData = user;
        this.loadRecentActivity();
        this.loadAccountProfile();
        this.loadUniverseMetrics();
        this.loadMyRequests();
        this.loadMyReports();

        this.universeStore.universes$.subscribe(universes => {
            this.universes = universes
                .filter(u => u.Nombre !== 'Sin universo')
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.sagas = this.universeStore.getAllSagas()
                .filter(s => s.Nombre !== 'Sin saga')
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.books = this.universeStore.getAllBooks()
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.antologies = this.universeStore.getAllAnthologies()
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.authors = this.getCollectionAuthors();
            this.loader.deactivateLoader();
        });
    }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    handleProfileImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    loadRecentActivity(): void {
        this.isRecentActivityLoading = true;
        this.userSrv.getRecentLibraryActivity(4).pipe(
            catchError(() => of([]))
        ).subscribe(activity => {
            this.recentActivity = activity;
            this.isRecentActivityLoading = false;
        });
    }

    loadAccountProfile(): void {
        this.isAccountProfileLoading = true;
        this.userSrv.getOwnProfile().subscribe({
            next: profile => {
                this.accountProfile = profile;
                this.isAccountProfileLoading = false;
            },
            error: () => this.isAccountProfileLoading = false
        });
    }

    loadUniverseMetrics(): void {
        this.areUniverseMetricsLoading = true;
        this.universeMetricsLoadError = false;
        this.universeSrv.getMetrics().subscribe({
            next: metrics => {
                this.universeMetrics = metrics;
                this.areUniverseMetricsLoading = false;
            },
            error: () => {
                this.universeMetrics = null;
                this.areUniverseMetricsLoading = false;
                this.universeMetricsLoadError = true;
            }
        });
    }

    setActiveSection(section: ProfileSection): void {
        if (section !== this.activeSection)
            this.activeTab = null;
        this.activeSection = section;
    }

    private isProfileSection(value: string | null): value is ProfileSection {
        return value === 'overview' || value === 'profile' || value === 'requests' || value === 'reports'
            || value === 'security' || value === 'preferences'
            || this.libraryLinks.some(link => link.section === value);
    }

    loadMyRequests(): void {
        this.areRequestsLoading = true;
        this.catalogRequestSrv.listMine('todas').pipe(
            catchError(() => of([]))
        ).subscribe(requests => {
            this.myRequests = requests;
            this.areRequestsLoading = false;
        });
    }

    loadMyReports(): void {
        this.areReportsLoading = true;
        this.reportSrv.listMine('todos').pipe(
            catchError(() => of([]))
        ).subscribe(reports => {
            this.myReports = reports;
            this.areReportsLoading = false;
        });
    }

    getActivityRoute(activity: RecentLibraryActivity): string[] {
        return activity.Tipo === 'antologia'
            ? ['/antology', String(activity.Id)]
            : ['/book', String(activity.Id)];
    }

    getAuthors(authors: { Nombre: string }[]): string {
        return authors.map(author => author.Nombre).join(', ');
    }

    requestFields(request: CatalogRequest): CatalogRequestField[] {
        return catalogRequestPayloadFields(request.Payload);
    }

    reportFields(report: ReportGroup): DisplayField[] {
        const ownReport = report.Reportes?.[0];
        return [
            { label: 'Ficha', value: report.Fuente?.Item?.Nombre || 'Contenido no disponible' },
            { label: 'Tipo', value: this.entityLabel(report.EntidadTipo) },
            { label: 'Motivo', value: ownReport?.Motivo || 'Sin motivo disponible' },
            { label: 'Fecha', value: this.formatDate(ownReport?.FechaCreacion || report.FechaCreacion) }
        ];
    }

    resolutionLabel(comment?: string | null): string {
        return comment?.trim() || 'Sin comentario de resolución.';
    }

    statusLabel(status: string): string {
        const labels: Record<string, string> = {
            pendiente: 'Pendiente',
            devuelta: 'Devuelta',
            aprobada: 'Aprobada',
            rechazada: 'Rechazada',
            aceptado: 'Aceptado',
            rechazado: 'Rechazado'
        };

        return labels[status] ?? status;
    }

    entityLabel(entityType: string): string {
        return catalogEntityLabel(entityType);
    }

    requestActionLabel(request: CatalogRequest): string {
        return catalogRequestActionLabel(request);
    }

    respondReturnedRequest(request: CatalogRequest): void {
        const response = this.requestResponses[request.Id]?.trim();
        if (!response) {
            this._snackBar.openSnackBar('Añade un comentario para reenviar la petición.', 'errorBar');
            return;
        }

        this.isRespondingRequest = true;
        this.catalogRequestSrv.respond(request.Id, {
            Payload: {
                ...request.Payload,
                Comentario: response
            }
        }).subscribe({
            next: updatedRequest => {
                this.myRequests = this.myRequests.map(item => item.Id === updatedRequest.Id ? updatedRequest : item);
                delete this.requestResponses[request.Id];
                this._snackBar.openSnackBar('Petición reenviada', 'successBar');
            },
            error: err => {
                this._snackBar.openApiError(err, 'No se pudo completar la acción');
                this.isRespondingRequest = false;
            },
            complete: () => {
                this.isRespondingRequest = false;
            }
        });
    }

    private getCollectionAuthors(): Author[] {
        const byId = new Map<number, Author>();
        [...this.books, ...this.antologies].forEach(item => {
            item.Autores
                ?.filter(author => author.Nombre !== 'Anónimo')
                .forEach(author => byId.set(author.Id, author));
        });

        return [...byId.values()].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
    }

    getStatusIcon(statusName: string): string {
        return getStatusIcon({ Nombre: statusName });
    }

    /** El nombre del perfil de Yosiftware (o el alias), el mismo que enseña la cabecera. */
    getProfileDisplayName(): string {
        return this.sessionSrv.userName || this.sessionSrv.cuenta?.alias || '';
    }

    getProfileHandle(): string {
        const alias = this.sessionSrv.cuenta?.alias;
        return alias ? `@${alias}` : '';
    }

    /** La miniatura del avatar de Yosiftware; sin ella, el icono de cuenta. */
    get avatarUrl(): string | null { return this.sessionSrv.avatarUrl; }

    /** El perfil público en la web social (con el símbolo del ecosistema). */
    get socialProfileUrl(): string {
        const id = this.sessionSrv.cuenta?.id;
        return id ? this.sessionSrv.socialProfileUrl(id) : this.sessionSrv.socialUrl('perfil');
    }

    /**
     * El perfil (nombre, biografía, avatar…) es el de la cuenta de Yosiftware: se edita en su vista, sobre la web
     * (`yosiftware.editarPerfil()`, ecosistema-kit/ACCESO.md, «El perfil»). Libros no guarda nada de eso.
     */
    editPlatformProfile(): void {
        void this.sessionSrv.editarPerfil().catch(error => this._snackBar.openApiError(error, 'No se pudo abrir tu perfil'));
    }




    formatDate(value?: string | null): string {
        if (!value)
            return 'Sin fecha';

        return new Date(value).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
