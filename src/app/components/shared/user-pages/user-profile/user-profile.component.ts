import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RecentLibraryActivity, User } from '../../../../interfaces/user';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, merge, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SessionService } from '../../../../services/auth/session.service';
import { UserService } from '../../../../services/entities/user.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { environment } from '../../../../../environment/environment';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Universe } from '../../../../interfaces/universe';
import { Saga } from '../../../../interfaces/saga';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { Author } from '../../../../interfaces/author';
import { BookSimple } from '../../../../interfaces/book';
import { Antology } from '../../../../interfaces/antology';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { COUNTRIES, CountryOption } from '../../../../shared/countries';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { CatalogRequest, ReportGroup } from '../../../../interfaces/catalog';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { ReportService } from '../../../../services/entities/report.service';
import { ActivityCategory, ActivityPreferences } from '../../../../interfaces/activity-preferences';
import { ActivityPreferencesService } from '../../../../services/entities/activity-preferences.service';
import { ModerationAppeal, ModerationIncident } from '../../../../interfaces/moderation';
import { ModerationService } from '../../../../services/entities/moderation.service';

type ProfileSection = 'overview' | 'profile' | 'activity' | 'moderation' | 'security' | 'requests' | 'reports';
type ProfileEditMode = 'identity' | 'username' | 'displayName' | 'bio' | 'country' | 'privacy';

interface DisplayField {
    label: string;
    value: string;
}

@Component({
    standalone: true,
    selector:  'app-user-profile',
    imports: [MatCardModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, MatInputModule, MatSelectModule, MatButtonModule, MatSlideToggleModule, MatIconModule, CommonModule, SnackbarModule, NgxDropzoneModule,
        MatTooltipModule, RouterLink, CoverCachePipe],
    templateUrl: './user-profile.component.html',
    styleUrl: './user-profile.component.sass'
})
export class UserProfileComponent implements OnInit {
    userData!: User;
    universes: Universe[] = [];
    sagas: Saga[] = [];
    authors: Author[] = [];
    books: BookSimple[] = [];
    antologies: Antology[] = [];
    countries: CountryOption[] = COUNTRIES;

    viewportSize!: { width: number, height: number };
    imgUrl = environment.getImgUrl;
    imageCacheBuster: number = Date.now();
    recentActivity: RecentLibraryActivity[] = [];
    isRecentActivityLoading = true;
    activeSection: ProfileSection = 'overview';
    myRequests: CatalogRequest[] = [];
    myReports: ReportGroup[] = [];
    areRequestsLoading = true;
    areReportsLoading = true;
    requestResponses: Record<number, string> = {};
    isRespondingRequest = false;
    activityPreferences: ActivityPreferences = {
        CompartirEstado: false,
        CompartirPuntuacion: false,
        CompartirResena: false,
        Reconocimientos: { Estado: false, Puntuacion: false, Resena: false },
        AudienciaPredeterminada: 'seguidores'
    };
    isActivityPreferencesLoading = true;
    isSavingActivityPreferences = false;
    acknowledgingActivityCategory: ActivityCategory | null = null;
    moderationIncidents: ModerationIncident[] = [];
    moderationAppeals: ModerationAppeal[] = [];
    isModerationLoading = true;
    appealDrafts: Record<number, string> = {};
    isSubmittingAppeal = false;

    modImg: boolean = false;
    photo!: File;
    files: File[] = [];

    modProfile: boolean = false;
    profileEditMode: ProfileEditMode = 'identity';
    errorUsernameMessage = '';
    errorDisplayNameMessage = '';
    errorBioMessage = '';
    errorPaisCodigoMessage = '';
    errorPaisNombreMessage = '';
    username = new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z0-9_]{3,50}$'),
        Validators.minLength(3),
        Validators.maxLength(50),
    ]);
    displayName = new FormControl('', [
        Validators.maxLength(80),
    ]);
    bio = new FormControl('', [
        Validators.maxLength(500),
    ]);
    paisCodigo = new FormControl('', [
        Validators.pattern('^[A-Za-z]{2}$'),
        Validators.minLength(2),
        Validators.maxLength(2),
    ]);
    paisNombre = new FormControl('', [
        Validators.maxLength(100),
    ]);
    perfilPublico = new FormControl(false);
    mostrarEstadisticas = new FormControl(false);
    mostrarBiblioteca = new FormControl(false);
    permitirMensajes = new FormControl(false);
    fgProfile = this.fBuild.group({
        username: this.username,
        displayName: this.displayName,
        bio: this.bio,
        paisCodigo: this.paisCodigo,
        paisNombre: this.paisNombre,
        perfilPublico: this.perfilPublico,
        mostrarEstadisticas: this.mostrarEstadisticas,
        mostrarBiblioteca: this.mostrarBiblioteca,
        permitirMensajes: this.permitirMensajes,
    });

    modName: boolean = false;
    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z]{3,15}'),
        Validators.minLength(3),
        Validators.maxLength(30),
    ]);
    fgName = this.fBuild.group({
        name: this.name,
    });

    modEmail: boolean = false;
    errorEmailMessage = '';
    email = new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(30),
    ]);
    fgEmail = this.fBuild.group({
        email: this.email,
    });

    modPassword: boolean = false;
    errorPasswordOldMessage = '';
    passOldHide: boolean = true;
    errorPasswordNewMessage = '';
    passNewHide: boolean = true;
    errorPasswordRepeatMessage = '';
    passRepHide: boolean = true;
    passwordOld = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);
    passwordNew = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);
    passwordRepeat = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);
    fgPassword = this.fBuild.group({
        passwordOld: this.passwordOld,
        passwordNew: this.passwordNew,
        passwordRepeat: this.passwordRepeat,
    });

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private sessionSrv: SessionService, private userSrv: UserService, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private loader: LoaderEmmitterService,
        private universeStore: UniverseStoreService, private catalogRequestSrv: CatalogRequestService, private reportSrv: ReportService, private activityPreferencesSrv: ActivityPreferencesService, private moderationSrv: ModerationService, private route: ActivatedRoute) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.username.statusChanges, this.username.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateUsernameErrorMessage());
        merge(this.displayName.statusChanges, this.displayName.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateDisplayNameErrorMessage());
        merge(this.bio.statusChanges, this.bio.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateBioErrorMessage());
        merge(this.paisCodigo.statusChanges, this.paisCodigo.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePaisCodigoErrorMessage());
        merge(this.paisNombre.statusChanges, this.paisNombre.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePaisNombreErrorMessage());
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.passwordOld.statusChanges, this.passwordOld.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordOldErrorMessage());
        merge(this.passwordNew.statusChanges, this.passwordNew.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordNewErrorMessage());
        merge(this.passwordRepeat.statusChanges, this.passwordRepeat.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordRepeatErrorMessage());
    }

    ngOnInit(): void {
        const requestedSection = this.route.snapshot.queryParamMap.get('section');
        if (this.isProfileSection(requestedSection))
            this.activeSection = requestedSection;
        this.loader.activateLoader();
        this.getViewportSize();
        const user = this.sessionSrv.userObject;
        this.userData = user;
        this.name.setValue(user.name);
        this.email.setValue(user.email);
        this.loadRecentActivity();
        this.loadMyRequests();
        this.loadMyReports();
        this.loadActivityPreferences();
        this.loadModeration();

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

    @HostListener('document:keydown.escape', ['$event'])
    handleEscapeEvent() {
        this.closeProfileModal();
    }

    @HostListener('document:keydown.enter', ['$event'])
    handleEnterEvent() {
        if (this.modPassword === true && this.fgPassword.valid)
            this.updatePassword();
    }

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

    openProfileEdit(mode: ProfileEditMode = 'identity'): void {
        this.profileEditMode = mode;
        if (!this.modProfile)
            this.invertModProfile();
    }

    setActiveSection(section: ProfileSection): void {
        this.activeSection = section;
    }

    private isProfileSection(value: string | null): value is ProfileSection {
        return value === 'overview' || value === 'profile' || value === 'activity' || value === 'moderation' || value === 'security' || value === 'requests' || value === 'reports';
    }

    loadActivityPreferences(): void {
        this.isActivityPreferencesLoading = true;
        this.activityPreferencesSrv.get().subscribe({
            next: preferences => { this.activityPreferences = preferences; this.isActivityPreferencesLoading = false; },
            error: () => { this.isActivityPreferencesLoading = false; }
        });
    }

    saveActivityPreferences(): void {
        if (!this.userData.perfilPublico || this.isSavingActivityPreferences)
            return;

        this.isSavingActivityPreferences = true;
        this.activityPreferencesSrv.save(this.activityPreferences).subscribe({
            next: preferences => {
                this.activityPreferences = preferences;
                this._snackBar.openSnackBar('Preferencias de actividad guardadas', 'successBar');
                this.isSavingActivityPreferences = false;
            },
            error: error => {
                this._snackBar.openSnackBar(getApiErrorMessage(error, 'No se han podido guardar las preferencias'), 'errorBar');
                this.isSavingActivityPreferences = false;
            }
        });
    }

    acknowledgeActivityCategory(category: ActivityCategory): void {
        if (this.acknowledgingActivityCategory)
            return;

        this.acknowledgingActivityCategory = category;
        this.activityPreferencesSrv.acknowledge(category).subscribe({
            next: recognitions => {
                this.activityPreferences = { ...this.activityPreferences, Reconocimientos: recognitions };
                this.acknowledgingActivityCategory = null;
            },
            error: error => {
                this._snackBar.openSnackBar(getApiErrorMessage(error, 'No se ha podido guardar la confirmación'), 'errorBar');
                this.acknowledgingActivityCategory = null;
            }
        });
    }

    loadModeration(): void {
        this.isModerationLoading = true;
        this.moderationSrv.listOwnIncidents({ limit: 50 }).subscribe({
            next: incidents => {
                this.moderationIncidents = incidents.items;
                this.moderationSrv.listOwnAppeals().subscribe({
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
        if (!sanctionId || incident.Sancion.Estado === 'none' || !text || this.isSubmittingAppeal)
            return;

        this.isSubmittingAppeal = true;
        this.moderationSrv.createAppeal(sanctionId, text).subscribe({
            next: () => {
                delete this.appealDrafts[sanctionId];
                this._snackBar.openSnackBar('Alegación enviada', 'successBar');
                this.isSubmittingAppeal = false;
                this.loadModeration();
            },
            error: error => {
                this._snackBar.openSnackBar(getApiErrorMessage(error, 'No se ha podido enviar la alegación'), 'errorBar');
                this.isSubmittingAppeal = false;
            }
        });
    }

    moderationStatusLabel(status: string): string {
        const labels: Record<string, string> = { none: 'Sin sanción', banned: 'Cuenta suspendida', blocked: 'Bloqueada', sanctioned: 'Sancionada', revoked: 'Revocada', pendiente: 'Pendiente', en_revision: 'En revisión', aceptada: 'Aceptada', rechazada: 'Rechazada' };
        return labels[status] ?? status;
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

    isProfileModalOpen(): boolean {
        return this.modImg || this.modName || this.modEmail || this.modPassword || this.modProfile;
    }

    getProfileModalTitle(): string {
        if (this.modProfile)
            return this.getProfileEditTitle();
        if (this.modName)
            return 'Cambiar nombre';
        if (this.modEmail)
            return 'Cambiar email';
        if (this.modPassword)
            return 'Cambiar contraseña';
        return 'Actualizar imagen';
    }

    closeProfileModal(): void {
        this.modImg = false;
        this.modName = false;
        this.modEmail = false;
        this.modPassword = false;
        this.modProfile = false;
        this.profileEditMode = 'identity';
        this.files = [];
        this.fgPassword.reset();
        this.fgPassword.markAsUntouched();
    }

    getActivityRoute(activity: RecentLibraryActivity): string[] {
        return activity.Tipo === 'antologia'
            ? ['/antology', String(activity.Id)]
            : ['/book', String(activity.Id)];
    }

    getAuthors(authors: { Nombre: string }[]): string {
        return authors.map(author => author.Nombre).join(', ');
    }

    requestFields(request: CatalogRequest): DisplayField[] {
        return this.payloadFields(request.Payload);
    }

    reportFields(report: ReportGroup): DisplayField[] {
        const ownReport = report.Reportes?.[0];
        return [
            { label: 'Ficha', value: report.Fuente?.Item?.Nombre || `#${report.EntidadId}` },
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
        const labels: Record<string, string> = {
            autor: 'Autor',
            universo: 'Universo',
            saga: 'Saga',
            libro: 'Libro',
            antologia: 'Antología'
        };

        return labels[entityType] ?? entityType;
    }

    requestActionLabel(request: CatalogRequest): string {
        return request.Accion === 'edicion' ? 'Corrección de ficha' : 'Alta en catálogo';
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
                this._snackBar.openSnackBar(getApiErrorMessage(err), 'errorBar');
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
        if (statusName === 'Por comprar')
            return 'add_shopping_cart';
        if (statusName === 'En espera')
            return 'schedule';
        if (statusName === 'En marcha')
            return 'auto_stories';
        return 'done_all';
    }

    getProfileDisplayName(): string {
        return this.userData.displayName || this.userData.name;
    }

    getProfileHandle(): string {
        return this.userData.username ? `@${this.userData.username}` : this.userData.email;
    }

    getEmailVerificationLabel(): string {
        if (this.userData.emailVerificado)
            return 'Email verificado';
        if (this.userData.verificationPending)
            return 'Verificación pendiente';
        return 'Email sin verificar';
    }

    getAccountStatusLabel(): string {
        return this.userData.estadoCuenta?.Nombre || 'Cuenta activa';
    }

    getCountryLabel(): string {
        const country = this.getCountryOption(this.userData.paisCodigo);
        if (country)
            return `${country.flag} ${country.name} (${country.code})`;
        if (this.userData.paisNombre && this.userData.paisCodigo)
            return `${this.userData.paisNombre} (${this.userData.paisCodigo})`;
        return this.userData.paisNombre || this.userData.paisCodigo || 'Sin país';
    }

    showProfileField(mode: ProfileEditMode): boolean {
        return this.profileEditMode === 'identity' || this.profileEditMode === mode;
    }

    isProfileEditInvalid(): boolean {
        if (this.profileEditMode === 'username')
            return this.username.invalid;
        if (this.profileEditMode === 'displayName')
            return this.displayName.invalid;
        if (this.profileEditMode === 'bio')
            return this.bio.invalid;
        if (this.profileEditMode === 'country')
            return this.paisCodigo.invalid || this.paisNombre.invalid;
        return this.profileEditMode === 'identity' && this.fgProfile.invalid;
    }

    private getProfileEditTitle(): string {
        const titles: Record<ProfileEditMode, string> = {
            identity: 'Editar identidad pública',
            username: 'Editar alias',
            displayName: 'Editar nombre visible',
            bio: 'Editar biografía',
            country: 'Editar país',
            privacy: 'Editar privacidad'
        };

        return titles[this.profileEditMode];
    }

    private payloadFields(payload: Record<string, unknown> | null | undefined): DisplayField[] {
        if (!payload)
            return [];

        return Object.entries(payload)
            .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
            .map(([key, value]) => ({
                label: this.payloadLabel(key),
                value: this.payloadValue(value)
            }));
    }

    private payloadLabel(key: string): string {
        const labels: Record<string, string> = {
            Nombre: 'Nombre',
            ISBN: 'ISBN',
            Paginas: 'Páginas',
            FechaPublicacion: 'Fecha de publicación',
            Comentario: 'Comentario del usuario'
        };

        return labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    private payloadValue(value: unknown): string {
        if (Array.isArray(value))
            return value.map(item => this.payloadValue(item)).join(', ');
        if (typeof value === 'object' && value !== null)
            return Object.entries(value as Record<string, unknown>)
                .map(([key, nestedValue]) => `${this.payloadLabel(key)}: ${this.payloadValue(nestedValue)}`)
                .join(' · ');
        return String(value);
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

    onSelect(event: { addedFiles: any; }) {
        this.files.push(...event.addedFiles);
        this.photo = event.addedFiles[0];
    }

    onRemove(event: File) {
        this.files.splice(this.files.indexOf(event), 1);
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateUsernameErrorMessage() {
        if (this.username.hasError('required'))
            this.errorUsernameMessage = 'El alias no puede quedar vacío';
        else if (this.username.hasError('minlength'))
            this.errorUsernameMessage = 'Alias demasiado corto';
        else if (this.username.hasError('maxlength'))
            this.errorUsernameMessage = 'Alias demasiado largo';
        else this.errorUsernameMessage = 'Usa letras, números o guion bajo';
    }

    updateDisplayNameErrorMessage() {
        if (this.displayName.hasError('maxlength'))
            this.errorDisplayNameMessage = 'Nombre visible demasiado largo';
        else this.errorDisplayNameMessage = '';
    }

    updateBioErrorMessage() {
        if (this.bio.hasError('maxlength'))
            this.errorBioMessage = 'Biografía demasiado larga';
        else this.errorBioMessage = '';
    }

    updatePaisCodigoErrorMessage() {
        if (this.paisCodigo.hasError('pattern') || this.paisCodigo.hasError('minlength') || this.paisCodigo.hasError('maxlength'))
            this.errorPaisCodigoMessage = 'Usa el código de país de dos letras';
        else this.errorPaisCodigoMessage = '';
    }

    updatePaisNombreErrorMessage() {
        if (this.paisNombre.hasError('maxlength'))
            this.errorPaisNombreMessage = 'País demasiado largo';
        else this.errorPaisNombreMessage = '';
    }

    getCountryOption(code: string | null | undefined): CountryOption | undefined {
        return this.countries.find(country => country.code === code);
    }

    private normalizeCountryName(countryName: string | null | undefined): string {
        return (countryName ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    updateCountryFromCode(code: string | null): void {
        const country = this.getCountryOption(code);
        this.paisNombre.setValue(country?.name ?? '');
        this.updatePaisCodigoErrorMessage();
        this.updatePaisNombreErrorMessage();
    }

    updateEmailErrorMessage() {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacío';
        else if (this.email.hasError('maxlength'))
            this.errorEmailMessage = 'Email demasiado largo';
        else this.errorEmailMessage = 'Email no válido';
    }

    updatePasswordOldErrorMessage() {
        if (this.passwordOld.hasError('required'))
            this.errorPasswordOldMessage = 'Debes introducir la contraseña previa';
        else if (this.passwordOld.hasError('minlength'))
            this.errorPasswordOldMessage = 'Contraseña demasiado corta';
        else if (this.passwordOld.hasError('maxlength'))
            this.errorPasswordOldMessage = 'Contraseña demasiado larga';
        else {
            this.errorPasswordOldMessage = '';
            this.passwordOld.setErrors(null);
        }
    }
    updatePasswordNewErrorMessage() {
        if (this.passwordNew.hasError('required'))
            this.errorPasswordNewMessage =
                'La contraseña nueva no puede quedar vacía';
        else if (this.passwordNew.hasError('minlength'))
            this.errorPasswordNewMessage = 'Contraseña demasiado corta';
        else if (this.passwordNew.hasError('maxlength'))
            this.errorPasswordNewMessage = 'Contraseña demasiado larga';
        else if (
            this.passwordNew.value != this.passwordRepeat.value &&
            this.passwordRepeat.value
        ) {
            this.errorPasswordNewMessage = 'Las contraseñas no coinciden';
            this.passwordNew.setErrors({ 'Las contraseñas no coinciden': true });
        } else if (this.passwordOld.value == this.passwordNew.value) {
            this.errorPasswordNewMessage =
                'La contraseña nueva debe ser distinta a la anterior';
            this.passwordNew.setErrors({
                'La contraseña nueva debe ser distinta a la anterior': true,
            });
        } else {
            this.errorPasswordNewMessage = '';
            this.passwordNew.setErrors(null);
        }
    }
    updatePasswordRepeatErrorMessage() {
        if (this.passwordRepeat.hasError('required'))
            this.errorPasswordRepeatMessage = 'Debes confirmar la contraseña nueva';
        else if (this.passwordRepeat.hasError('minlength'))
            this.errorPasswordRepeatMessage = 'Contraseña demasiado corta';
        else if (this.passwordRepeat.hasError('maxlength'))
            this.errorPasswordRepeatMessage = 'Contraseña demasiado larga';
        else if (this.passwordNew.value != this.passwordRepeat.value) {
            this.errorPasswordRepeatMessage = 'Las contraseñas no coinciden';
            this.passwordRepeat.setErrors({ 'Las contraseñas no coinciden': true });
        } else if (this.passwordOld.value == this.passwordRepeat.value) {
            this.errorPasswordRepeatMessage =
                'La contraseña nueva debe ser distinta a la anterior';
            this.passwordRepeat.setErrors({
                'La contraseña nueva debe ser distinta a la anterior': true,
            });
        } else {
            this.errorPasswordRepeatMessage = '';
            this.passwordRepeat.setErrors(null);
        }
    }

    invertModImg(): void {
        this.modImg = !this.modImg;
        if (this.modImg === true) {
            this.files = [];
            if (this.modProfile === true) this.invertModProfile();
            if (this.modName === true) this.invertModName();
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateImg(): void {
        if (this.files.length !== 1) {
            this._snackBar.openSnackBar('Error: problema con la imagen', 'errorBar');
            return;
        }
        this.loader.activateLoader();
        this.userSrv.updateImg(this.photo).subscribe({
            next: () => {
                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;

                    this.imageCacheBuster = Date.now();
                    this.modImg = false;
                    this._snackBar.openSnackBar('Imagen de perfil actualizada', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(getApiErrorMessage(err), 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    invertModName(): void {
        this.modName = !this.modName;
        if (this.modName === true) {
            this.name.setValue(this.userData.name);
            if (this.modProfile === true) this.invertModProfile();
            if (this.modImg === true) this.invertModImg();
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateName(nameNew: string): void {
        if (this.fgName.invalid || nameNew === this.userData.name) {
            this._snackBar.openSnackBar('Nombre inválido o sin cambios.', 'errorBar');
            return;
        }

        this.loader.activateLoader();

        this.userSrv.updateName(nameNew).subscribe({
            next: () => {
                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;
                    this.modName = false;
                    this._snackBar.openSnackBar('Nombre actualizado', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(getApiErrorMessage(err), 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    invertModEmail(): void {
        this.modEmail = !this.modEmail;
        if (this.modEmail === true) {
            this.email.setValue(this.userData.email);
            if (this.modProfile === true) this.invertModProfile();
            if (this.modImg === true) this.invertModImg();
            if (this.modName === true) this.invertModName();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateEmail(emailNew: string): void {
        if (this.fgEmail.invalid || emailNew === this.userData.email) {
            this._snackBar.openSnackBar('Email inválido o sin cambios.', 'errorBar');
            return;
        }

        this.loader.activateLoader();

        this.userSrv.updateEmail(emailNew).subscribe({
            next: (response) => {
                if (response.EmailChangePending) {
                    this.modEmail = false;
                    this._snackBar.openSnackBar('Revisa el nuevo email para confirmar el cambio', 'successBar');
                    return;
                }

                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;
                    this.modEmail = false;
                    this._snackBar.openSnackBar('Email actualizado', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(getApiErrorMessage(err), 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    invertModPassword(): void {
        this.modPassword = !this.modPassword;
        if (this.modPassword === true) {
            if (this.modProfile === true) this.invertModProfile();
            if (this.modImg === true) this.invertModImg();
            if (this.modName === true) this.invertModName();
            if (this.modEmail === true) this.invertModEmail();
        } else {
            this.fgPassword.reset();
            this.fgPassword.markAsUntouched();
        }
    }
    updatePassword(): void {
        if (this.fgPassword.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgPassword.errors, 'errorBar');
            return;
        }

        this.loader.activateLoader();

        this.userSrv.updatePassword(
            this.fgPassword.value.passwordNew ?? '',
            this.fgPassword.value.passwordOld ?? ''
        ).subscribe({
            next: () => {
                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;
                    this.modPassword = false;
                    this._snackBar.openSnackBar('Contraseña actualizada', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(getApiErrorMessage(err), 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    invertModProfile(): void {
        this.modProfile = !this.modProfile;
        if (this.modProfile === true) {
            this.populateProfileForm();
            if (this.modImg === true) this.invertModImg();
            if (this.modName === true) this.invertModName();
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
        }
    }

    populateProfileForm(): void {
        this.username.setValue(this.userData.username ?? '');
        this.displayName.setValue(this.userData.displayName ?? '');
        this.bio.setValue(this.userData.bio ?? '');
        const countryCode = this.userData.paisCodigo
            ?? this.countries.find(country => this.normalizeCountryName(country.name) === this.normalizeCountryName(this.userData.paisNombre))?.code
            ?? '';
        this.paisCodigo.setValue(countryCode);
        this.updateCountryFromCode(countryCode);
        this.perfilPublico.setValue(this.userData.perfilPublico ?? false);
        this.mostrarEstadisticas.setValue(this.userData.mostrarEstadisticas ?? false);
        this.mostrarBiblioteca.setValue(this.userData.mostrarBiblioteca ?? false);
        this.permitirMensajes.setValue(this.userData.permitirMensajes ?? false);
    }

    updateProfile(): void {
        if (this.isProfileEditInvalid()) {
            this._snackBar.openSnackBar('Revisa los datos del perfil.', 'errorBar');
            return;
        }

        const profile = {
            username: this.showProfileField('username') ? this.username.value?.trim() || null : this.userData.username ?? null,
            displayName: this.showProfileField('displayName') ? this.displayName.value?.trim() || null : this.userData.displayName ?? null,
            bio: this.showProfileField('bio') ? this.bio.value?.trim() || null : this.userData.bio ?? null,
            paisCodigo: this.showProfileField('country') ? this.paisCodigo.value?.trim().toUpperCase() || null : this.userData.paisCodigo ?? null,
            paisNombre: this.showProfileField('country') ? this.paisNombre.value?.trim() || null : this.userData.paisNombre ?? null,
            perfilPublico: this.showProfileField('privacy') ? this.perfilPublico.value ?? false : this.userData.perfilPublico ?? false,
            mostrarEstadisticas: this.showProfileField('privacy') ? this.mostrarEstadisticas.value ?? false : this.userData.mostrarEstadisticas ?? false,
            mostrarBiblioteca: this.showProfileField('privacy') ? this.mostrarBiblioteca.value ?? false : this.userData.mostrarBiblioteca ?? false,
            permitirMensajes: this.showProfileField('privacy') ? this.permitirMensajes.value ?? false : this.userData.permitirMensajes ?? false,
        };

        this.loader.activateLoader();
        this.userSrv.updateProfile(profile).subscribe({
            next: () => {
                this.sessionSrv.applyLocalProfileUpdate(profile);
                this.userData = this.sessionSrv.userObject;
                this.modProfile = false;
                this._snackBar.openSnackBar('Perfil actualizado', 'successBar');
            },
            error: (err) => {
                this._snackBar.openSnackBar(getApiErrorMessage(err), 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
