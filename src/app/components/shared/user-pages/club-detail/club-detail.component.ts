import { StatisticsService } from '../../../../services/other/statistics.service';
import { StatRow, communityReadingRows } from '../../../../shared/library-stats';
import { platformAssetUrl } from '../../../../shared/platform';
import { StatRowsComponent } from '../../common/stat-rows/stat-rows.component';
import { WebClubDetailViewComponent } from '../../../web/social/web-club-detail-view/web-club-detail-view.component';
import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClubCalendarEvent, ClubDebate, ClubDebateDetail, ClubDetail, ClubMember, ClubMilestone, ClubPoll, ClubProgress, ClubPublication, ClubPublicationCursor, ClubReading } from '../../../../interfaces/community';
import { EspacioPlataforma, InvitacionEnviada, RolDeInvitacion, SolicitudDeEntrada } from '../../../../interfaces/platform-spaces';
import { PlataformaPersona } from '../../../../interfaces/platform-person';
import { CommunityService } from '../../../../services/entities/community.service';
import { getApiErrorCode, getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { ClubChannelReconciler, ClubChannelSection, FEED_RETRY_DELAYS_MS, SOCIAL_SECURITY_VIEW, clubPersonName, spaceErrorMessage } from '../../../../shared/club-spaces';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { PlatformSpacesService, SpaceChannelHandle } from '../../../../services/platform/platform-spaces.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileClubDetailViewComponent } from '../../../mobile/social/mobile-club-detail-view/mobile-club-detail-view.component';
import { ChatConversationComponent } from '../chat-conversation/chat-conversation.component';

/** La conversación del espacio llega segundos después de crear el club: se vuelve a mirar unas pocas veces. */
const CONVERSATION_RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 30_000];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * El club de lectura. Su contenido (lecturas, progreso, hitos, calendario, debates, encuestas y publicaciones) es de
 * Libros; la pertenencia, la conversación y el canal son del espacio del club en la plataforma (ESPACIOS.md,
 * ADHESION_YOSIFTWARE.md, «Los clubes»):
 * - entrar en uno abierto, pedir entrar, invitar, las solicitudes y salir, con `/v1/espacios` (`PlatformSpacesService`);
 * - expulsar y cambiar el rol, con las rutas de Libros (solo la propiedad);
 * - el chat es la conversación del espacio (`ConversacionId`) con la interfaz de chat de Libros;
 * - lo que cambia en directo llega por el canal del espacio y se relee por REST (`ClubChannelReconciler`);
 * - el feed tarda: tras entrar se reintenta con esperas acotadas antes de dar el club por inaccesible.
 */
@Component({
    standalone: true,
    selector: 'app-club-detail',
    imports: [StatRowsComponent, WebClubDetailViewComponent, DatePipe, FormsModule, MatIconModule, MatTooltipModule, RouterLink, MobileClubDetailViewComponent, ChatConversationComponent],
    templateUrl: './club-detail.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './club-detail.component.sass'
})
export class ClubDetailComponent implements OnInit, OnDestroy {
    club: ClubDetail | null = null;
    /** Autores más leídos por los miembros (solo clubes abiertos; menos de tres lectores no cuenta). */
    clubReadingAuthors: StatRow[] = [];
    isLoading = true;
    error = '';
    sectionError = '';
    isJoining = false;
    joinRequestDialogOpen = false;
    joinRequestMessage = '';
    actionMessage = '';
    /** Lo que la persona puede hacer para arreglar el último error de la plataforma. */
    actionHelp: 'dos_pasos' | null = null;
    memberActionUserIds = new Set<number>();
    isLeaving = false;
    clubDeleted = false;
    deletedClubName = '';
    isDeletingClub = false;
    isRestoringClub = false;
    readings: ClubReading[] = [];
    isReadingsLoading = false;
    readingTargetType: ClubReading['Objetivo']['Tipo'] = 'libro';
    readingTargetId: number | null = null;
    readingTargetText = '';
    readingStart = '';
    readingEnd = '';
    isSavingReading = false;
    readingError = '';
    progress: ClubProgress[] = [];
    progressReadingId: number | null = null;
    progressPage: number | null = null;
    progressChapter = '';
    progressShared = false;
    isSavingProgress = false;
    progressError = '';
    milestones: ClubMilestone[] = [];
    milestoneTitle = '';
    milestoneType: ClubMilestone['Tipo'] = 'pagina';
    milestoneReadingId: number | null = null;
    milestoneStart: number | null = null;
    milestoneEnd: number | null = null;
    milestoneText = '';
    milestoneDate = '';
    isCreatingMilestone = false;
    milestoneError = '';
    calendarEvents: ClubCalendarEvent[] = [];
    calendarTitle = '';
    calendarDescription = '';
    calendarStart = '';
    calendarEnd = '';
    calendarMilestoneId: number | null = null;
    isSavingCalendarEvent = false;
    calendarError = '';
    /** El espacio del club, con lo de la persona en él (`yo`: su rol y sus capacidades). */
    space: EspacioPlataforma | null = null;
    /** Esperando a que el feed le diga a Libros que la persona ya es miembro. */
    membershipSync: 'idle' | 'waiting' | 'timeout' = 'idle';
    isWithdrawingRequest = false;
    joinRequests: SolicitudDeEntrada[] = [];
    joinRequestActionIds = new Set<number>();
    peopleQuery = '';
    people: PlataformaPersona[] = [];
    isSearchingPeople = false;
    peopleSearched = false;
    invitationEmail = '';
    invitationRole: RolDeInvitacion = 'miembro';
    invitingKeys = new Set<string>();
    sentInvitations: InvitacionEnviada[] = [];
    invitationActionIds = new Set<number>();
    membershipError = '';
    isReportingClub = false;
    publications: ClubPublication[] = [];
    nextPublicationCursor: ClubPublicationCursor | null = null;
    isLoadingPublications = false;
    reportingPublicationIds = new Set<number>();
    publicationError = '';
    debates: ClubDebate[] = [];
    selectedDebate: ClubDebateDetail | null = null;
    debateTitle = '';
    debateContent = '';
    debateReadingId: number | null = null;
    debateSpoilerStart: number | null = null;
    debateSpoilerEnd: number | null = null;
    debateComment = '';
    revealDebateSpoilers = false;
    debateError = '';
    polls: ClubPoll[] = [];
    pollQuestion = '';
    pollOptions = '';
    pollClosingDate = '';
    pollActionIds = new Set<number>();
    isCreatingPoll = false;
    pollError = '';
    private clubId = 0;
    private loadVersion = 0;
    /** Miembro según `GET /clubes-lectura/mios` cuando la persona no sale en la primera página de miembros. */
    private memberByMyClubs = false;
    private syncAttempt = 0;
    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private conversationAttempt = 0;
    private conversationTimer: ReturnType<typeof setTimeout> | null = null;
    private channel: SpaceChannelHandle | null = null;
    private channelSpaceId: number | null = null;
    private reconciler: ClubChannelReconciler | null = null;
    /** El canal de este espacio dijo `cerrado` (o falló): no se vuelve a abrir solo, para no entrar en un bucle. */
    private channelEndedFor: number | null = null;
    private destroyed = false;

    constructor(private route: ActivatedRoute, private community: CommunityService, private session: PlatformSessionService, private router: Router, private universeStore: UniverseStoreService, private presentation: PresentationModeService, private statisticsSrv: StatisticsService, private spaces: PlatformSpacesService) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    ngOnInit(): void {
        this.clubId = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isInteger(this.clubId) || this.clubId < 1) {
            this.isLoading = false;
            this.error = 'El club solicitado no es válido.';
            return;
        }
        this.load();
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.closeChannel();
        this.stopMembershipSync();
        if (this.conversationTimer) clearTimeout(this.conversationTimer);
        this.conversationTimer = null;
    }

    load(): void {
        this.isLoading = true;
        this.error = '';
        this.fetchClub(true);
    }

    /** Vuelve a leer el detalle sin la carga a pantalla completa (el canal, una espera del feed). */
    refreshClub(withSections = false): void {
        this.fetchClub(withSections);
    }

    private fetchClub(withSections: boolean): void {
        const version = ++this.loadVersion;
        const generation = this.session.generation;
        this.community.club(this.clubId).subscribe({
            next: club => {
                if (version !== this.loadVersion || !this.session.isCurrentGeneration(generation)) return;
                const firstLoad = this.club === null;
                this.club = club;
                this.isLoading = false;
                this.afterClubLoaded(withSections || firstLoad);
            },
            error: error => {
                if (version !== this.loadVersion || !this.session.isCurrentGeneration(generation)) return;
                if (getApiErrorCode(error) === 'club_access_unavailable') {
                    // Recién entrado: el feed aún no se lo ha dicho a Libros. Se espera antes de darlo por inaccesible.
                    if (this.spaces.isRecentEntry(this.clubId)) {
                        this.isLoading = false;
                        this.startMembershipSync();
                        return;
                    }
                    this.closeChannel();
                    void this.router.navigate(['/dashboard/community'], { state: { clubAccessRevoked: true } });
                    return;
                }
                this.error = getProductStateMessage(error, 'No se ha podido cargar este club.');
                this.isLoading = false;
            }
        });
    }

    private afterClubLoaded(withSections: boolean): void {
        const club = this.club;
        if (!club) return;
        if (withSections) this.loadSections();
        if (!this.isMember && club.SiguienteCursorMiembros) this.checkMembershipInMyClubs();
        if (this.isMember) {
            if (this.membershipSync !== 'idle') this.stopMembershipSync();
            this.spaces.forgetEntry(club.Id);
            this.openChannel();
            this.scheduleConversationRetry();
        } else if (this.membershipSync === 'idle' && this.spaces.isRecentEntry(club.Id)) {
            this.startMembershipSync();
        }
        // El espacio solo se le enseña a sus miembros (`404 espacio_no_encontrado` a los demás): se pide al serlo, o
        // mientras se espera al feed tras entrar.
        if (this.isMember || this.membershipSync !== 'idle') this.loadSpace();
        else this.space = null;
    }

    private loadSections(): void {
        this.loadClubReadingAuthors();
        this.loadReadings();
        this.loadProgress();
        this.loadMilestones();
        this.loadCalendar();
        this.loadDebates();
        this.loadPolls();
        if (this.isMember) this.loadPublications();
    }

    /** Lo de la persona en el espacio (`yo`): su rol y si puede invitar, gestionar o chatear. */
    private loadSpace(): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId) {
            this.space = null;
            return;
        }
        this.spaces.space(spaceId).subscribe({
            next: space => {
                if (this.club?.EspacioId !== spaceId) return;
                this.space = space;
                // La plataforma ya cuenta a la persona como miembro y Libros aún no: el feed está en camino.
                if (space.yo?.estado === 'activo' && !this.isMember && this.membershipSync === 'idle') {
                    this.spaces.markEntered(this.clubId);
                    this.startMembershipSync();
                }
                this.loadManagement();
            },
            error: () => {
                if (this.club?.EspacioId !== spaceId) return;
                this.space = null;
                this.loadManagement();
            }
        });
    }

    private loadManagement(): void {
        if (!this.canInvite) {
            this.joinRequests = [];
            this.sentInvitations = [];
            return;
        }
        this.loadJoinRequests();
        this.loadSentInvitations();
    }

    private checkMembershipInMyClubs(): void {
        this.community.myClubs().subscribe({
            next: page => {
                const member = page.Clubes.some(club => club.Id === this.clubId);
                if (member === this.memberByMyClubs) return;
                this.memberByMyClubs = member;
                if (member) { this.loadPublications(); this.afterClubLoaded(false); }
            },
            error: () => undefined
        });
    }

    // ---- Pertenencia: entrar, pedir entrar y salir (espacios de la plataforma) ----

    /** La persona está en la copia de Libros (la que autoriza el contenido del club). */
    get isMember(): boolean {
        if (!this.club) return false;
        return this.club.PropietarioId === this.session.userId || this.memberByMyClubs || this.club.MiembrosDetalle.some(member => member.Id === this.session.userId);
    }

    /** La plataforma ya la cuenta como miembro activo (puede ir por delante de Libros). */
    get isSpaceMember(): boolean { return this.space?.yo?.estado === 'activo'; }

    /** Pausada en el espacio: exige la verificación en dos pasos y no la tiene. */
    get needsTwoSteps(): boolean { return this.space?.yo?.estado === 'sin_dos_pasos'; }

    get ownRequestPending(): boolean { return this.spaces.hasOwnRequest(this.club?.EspacioId); }

    get canJoin(): boolean { return !!this.club && !this.isMember && !this.isSpaceMember && this.membershipSync === 'idle'; }

    /** Quien puede invitar y aprobar solicitudes (capacidad `invitar` del espacio; sin espacio, el rol de Libros). */
    get canInvite(): boolean {
        if (!this.isMember || !this.club?.EspacioId) return false;
        return this.space ? this.space.yo?.capacidades.invitar === true : this.canManageClub;
    }

    get acceptsRequests(): boolean { return this.club?.Visibilidad === 'cerrado'; }

    get securityUrl(): string { return this.session.socialUrl(SOCIAL_SECURITY_VIEW); }

    joinOrRequest(): void {
        if (!this.club || this.isJoining) return;
        if (!this.club.EspacioId) {
            this.actionMessage = 'Este club aún no está en los espacios de Yosiftware. Vuelve a intentarlo más tarde.';
            return;
        }
        if (this.club.Visibilidad === 'cerrado') {
            this.joinRequestDialogOpen = true;
            return;
        }
        this.submitJoinRequest();
    }

    submitJoinRequest(): void {
        const club = this.club;
        if (!club?.EspacioId || this.isJoining) return;
        this.isJoining = true;
        this.actionMessage = '';
        this.actionHelp = null;
        if (club.Visibilidad === 'abierto') {
            this.spaces.enter(club.EspacioId, club.Id).subscribe({
                next: space => {
                    this.isJoining = false;
                    this.space = space;
                    this.actionMessage = `Ya eres miembro de ${club.Nombre}. Libros tarda unos segundos en abrirte el club.`;
                    this.startMembershipSync();
                },
                error: error => this.joinFailed(error, club.Id)
            });
            return;
        }
        this.spaces.requestAccess(club.EspacioId, club, this.joinRequestMessage).subscribe({
            next: () => {
                this.isJoining = false;
                this.joinRequestDialogOpen = false;
                this.joinRequestMessage = '';
                this.actionMessage = 'Tu solicitud se ha enviado. Quien gestiona el club recibe un aviso, y la respuesta te llegará a la campana de Yosiftware.';
            },
            error: error => this.joinFailed(error, club.Id)
        });
    }

    withdrawJoinRequest(): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId || this.isWithdrawingRequest) return;
        this.isWithdrawingRequest = true;
        this.actionMessage = '';
        this.spaces.withdrawRequest(spaceId).subscribe({
            next: () => { this.isWithdrawingRequest = false; this.actionMessage = 'Has retirado tu solicitud.'; },
            error: error => {
                this.isWithdrawingRequest = false;
                if (getApiErrorCode(error) === 'solicitud_no_encontrada') this.spaces.forgetOwnRequest(spaceId);
                this.actionMessage = spaceErrorMessage(error, 'No se ha podido retirar la solicitud.');
            }
        });
    }

    private joinFailed(error: unknown, clubId: number): void {
        this.isJoining = false;
        const code = getApiErrorCode(error);
        if (code === 'ya_es_miembro') {
            this.joinRequestDialogOpen = false;
            this.spaces.markEntered(clubId);
            this.actionMessage = 'Ya eres miembro de este club. Libros tarda unos segundos en abrírtelo.';
            this.startMembershipSync();
            return;
        }
        this.actionHelp = code === 'dos_pasos_necesarios' ? 'dos_pasos' : null;
        this.actionMessage = spaceErrorMessage(error, getProductStateMessage(error, 'No se ha podido completar la solicitud.'));
    }

    /**
     * Espera acotada al feed (FEED_RETRY_DELAYS_MS, unos 5 minutos): se mira `GET /clubes-lectura/mios` hasta que trae el
     * club y entonces se recarga. Si no llega, se dice y se deja reintentar a mano; nunca un bucle infinito.
     */
    startMembershipSync(): void {
        if (this.destroyed) return;
        this.stopMembershipSync();
        // Una entrada nueva: el canal se podrá volver a abrir cuando Libros la confirme.
        this.channelEndedFor = null;
        this.membershipSync = 'waiting';
        this.syncAttempt = 0;
        this.scheduleMembershipCheck();
    }

    private scheduleMembershipCheck(): void {
        if (this.destroyed) return;
        if (this.syncAttempt >= FEED_RETRY_DELAYS_MS.length) {
            this.syncTimer = null;
            this.membershipSync = 'timeout';
            return;
        }
        const delay = FEED_RETRY_DELAYS_MS[this.syncAttempt++];
        const generation = this.session.generation;
        this.syncTimer = setTimeout(() => {
            this.syncTimer = null;
            if (this.destroyed || !this.session.isCurrentGeneration(generation)) return;
            this.community.myClubs().subscribe({
                next: page => {
                    if (this.destroyed || this.membershipSync !== 'waiting') return;
                    if (page.Clubes.some(club => club.Id === this.clubId)) {
                        this.memberByMyClubs = true;
                        this.membershipSync = 'idle';
                        this.refreshClub(true);
                    } else this.scheduleMembershipCheck();
                },
                error: () => { if (this.membershipSync === 'waiting') this.scheduleMembershipCheck(); }
            });
        }, delay);
    }

    private stopMembershipSync(): void {
        if (this.syncTimer) clearTimeout(this.syncTimer);
        this.syncTimer = null;
        this.membershipSync = 'idle';
    }

    leaveClub(): void {
        const club = this.club;
        if (!club?.EspacioId || !this.isMember || this.isOwner || this.isLeaving || !window.confirm('¿Quieres abandonar este club? Perderás acceso inmediato a su chat y contenido privado.')) return;
        this.isLeaving = true;
        this.actionMessage = '';
        this.spaces.leave(club.EspacioId, club.Id).subscribe({
            next: () => {
                this.closeChannel();
                void this.router.navigate(['/dashboard/community']);
            },
            error: error => { this.actionMessage = spaceErrorMessage(error, getProductStateMessage(error, 'No se ha podido abandonar el club.')); this.isLeaving = false; }
        });
    }

    loadReadings(): void {
        this.isReadingsLoading = true;
        this.community.clubReadings(this.clubId).subscribe({
            next: readings => { this.readings = readings; this.isReadingsLoading = false; },
            error: () => { this.readings = []; this.isReadingsLoading = false; this.setSectionError('lecturas'); }
        });
    }

    setCurrentReading(): void {
        if (!this.readingTargetId || this.isSavingReading || !this.canManageClub) return;
        if (!this.isReadingTargetAvailable) { this.readingError = 'Añade este libro a tu colección antes de establecerlo como lectura del club.'; return; }
        if (this.readingStart && this.readingEnd && new Date(this.readingEnd) < new Date(this.readingStart)) { this.readingError = 'La fecha final no puede ser anterior al inicio.'; return; }
        this.isSavingReading = true;
        this.readingError = '';
        this.community.setCurrentClubReading(this.clubId, {
            Objetivo: { Tipo: this.readingTargetType, Id: this.readingTargetId },
            ...(this.readingStart ? { FechaInicio: new Date(this.readingStart).toISOString() } : {}),
            ...(this.readingEnd ? { FechaFin: new Date(this.readingEnd).toISOString() } : {}),
            ...(this.readingTargetText.trim() ? { ObjetivoTexto: this.readingTargetText.trim() } : {})
        }).subscribe({
            next: () => { this.readingTargetId = null; this.readingTargetText = ''; this.readingStart = ''; this.readingEnd = ''; this.isSavingReading = false; this.loadReadings(); },
            error: error => { this.readingError = this.clubMessage(error, 'No se ha podido actualizar la lectura actual.'); this.isSavingReading = false; }
        });
    }

    loadProgress(): void {
        this.community.clubProgress(this.clubId).subscribe({
            next: progress => { this.progress = progress; this.applyProgressForSelectedReading(); },
            error: () => { this.progress = []; this.setSectionError('progreso'); }
        });
    }

    get canManageClub(): boolean {
        if (!this.club) return false;
        return this.club.PropietarioId === this.session.userId || this.club.MiembrosDetalle.some(member => member.Id === this.session.userId && member.Rol === 'moderador');
    }

    get isReadingTargetAvailable(): boolean {
        return !!this.readingTargetId && this.readingTargetOptions.some(item => item.Id === Number(this.readingTargetId));
    }

    get readingTargetOptions(): Array<{ Id: number; Nombre: string }> {
        const options = this.readingTargetType === 'libro' ? this.universeStore.getAllBooks()
            : this.readingTargetType === 'antologia' ? this.universeStore.getAllAnthologies()
                : this.readingTargetType === 'saga' ? this.universeStore.getAllSagas()
                    : this.universeStore.getUniverses();
        return options.slice().sort((a, b) => a.Nombre.localeCompare(b.Nombre));
    }

    selectReadingTargetType(): void { this.readingTargetId = null; }


    get isOwner(): boolean { return this.club?.PropietarioId === this.session.userId; }

    changeMemberRole(member: ClubMember): void {
        if (!this.club || !this.isOwner || member.Rol === 'propietario' || this.memberActionUserIds.has(member.Id)) return;
        this.memberActionUserIds.add(member.Id);
        this.actionMessage = '';
        const role = member.Rol === 'moderador' ? 'miembro' : 'moderador';
        this.community.changeClubMemberRole(this.club.Id, member.Id, role).subscribe({
            next: () => { this.memberActionUserIds.delete(member.Id); this.load(); },
            error: error => { this.actionMessage = this.clubMessage(error, 'No se ha podido cambiar el rol.'); this.memberActionUserIds.delete(member.Id); }
        });
    }

    removeMember(member: ClubMember): void {
        if (!this.club || !this.isOwner || member.Rol === 'propietario' || this.memberActionUserIds.has(member.Id) || !window.confirm(`¿Quieres expulsar a ${member.Nombre} del club?`)) return;
        this.memberActionUserIds.add(member.Id);
        this.actionMessage = '';
        this.community.removeClubMember(this.club.Id, member.Id).subscribe({
            next: () => { this.memberActionUserIds.delete(member.Id); this.load(); },
            error: error => { this.actionMessage = this.clubMessage(error, 'No se ha podido expulsar al miembro.'); this.memberActionUserIds.delete(member.Id); }
        });
    }


    deleteClub(): void {
        if (!this.club || !this.isOwner || this.isDeletingClub || !window.confirm('¿Quieres eliminar este club? El acceso, el chat y las superficies privadas quedarán revocados hasta restaurarlo.')) return;
        this.isDeletingClub = true;
        this.actionMessage = '';
        const name = this.club.Nombre;
        this.community.deleteClub(this.club.Id).subscribe({
            next: () => {
                this.deletedClubName = name;
                this.clubDeleted = true;
                this.club = null;
                this.isDeletingClub = false;
            },
            error: error => { this.actionMessage = this.clubMessage(error, 'No se ha podido eliminar el club.'); this.isDeletingClub = false; }
        });
    }

    restoreClub(): void {
        if (!this.clubDeleted || this.isRestoringClub) return;
        this.isRestoringClub = true;
        this.actionMessage = '';
        this.community.restoreClub(this.clubId).subscribe({
            next: () => { this.clubDeleted = false; this.isRestoringClub = false; this.load(); },
            error: error => { this.actionMessage = this.clubMessage(error, 'No se ha podido restaurar el club.'); this.isRestoringClub = false; }
        });
    }


    // ---- La conversación del club: la del espacio, con el chat de la plataforma pintado por Libros ----

    /** La conversación del espacio, para incrustarla (solo miembros y si su rol entra en el chat). */
    get clubConversationId(): number | null {
        return this.clubChatAvailable ? this.club?.ConversacionId ?? null : null;
    }

    get clubChatAvailable(): boolean {
        return this.isMember && !!this.club?.ConversacionId && this.space?.yo?.capacidades.chat !== 'nada';
    }

    get clubChatUnavailableReason(): string {
        if (!this.club || this.clubChatAvailable) return '';
        if (!this.isMember) return 'El chat es para los miembros del club.';
        if (this.space?.yo?.capacidades.chat === 'nada') return 'Tu papel en el club no entra en su chat.';
        return 'La conversación del club se está preparando. Vuelve a intentarlo en unos segundos.';
    }

    /** Abre la conversación del club en Mensajes (la misma interfaz de chat de Libros). */
    openClubChat(): void {
        const conversationId = this.clubConversationId;
        if (!conversationId) {
            this.actionMessage = this.clubChatUnavailableReason;
            return;
        }
        void this.router.navigate(['/dashboard/community/messages', conversationId]);
    }

    /** `ConversacionId` es `null` unos segundos tras crear el club: se vuelve a mirar unas pocas veces. */
    private scheduleConversationRetry(): void {
        if (this.club?.ConversacionId || this.conversationTimer || this.conversationAttempt >= CONVERSATION_RETRY_DELAYS_MS.length) return;
        const delay = CONVERSATION_RETRY_DELAYS_MS[this.conversationAttempt++];
        this.conversationTimer = setTimeout(() => {
            this.conversationTimer = null;
            if (!this.destroyed && !this.club?.ConversacionId) this.refreshClub();
        }, delay);
    }

    // ---- El canal del espacio: lo que cambia en directo ----

    private openChannel(): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId || !this.isMember || this.destroyed || this.channelEndedFor === spaceId) return;
        if (this.channel && this.channelSpaceId === spaceId) return;
        this.closeChannel();
        const reconciler = new ClubChannelReconciler(this.clubId, {
            refresh: sections => this.applyChannelRefresh(sections),
            closed: reason => this.onChannelClosed(reason)
        });
        this.reconciler = reconciler;
        this.channelSpaceId = spaceId;
        this.channel = this.spaces.openChannel(spaceId, message => reconciler.apply(message));
    }

    private closeChannel(): void {
        this.reconciler?.stop();
        this.reconciler = null;
        this.channel?.close();
        this.channel = null;
        this.channelSpaceId = null;
    }

    /** Cada mensaje dice qué ha cambiado: se relee solo eso. Con `desfase`, todo. */
    applyChannelRefresh(sections: ReadonlySet<ClubChannelSection>): void {
        if (this.destroyed || !this.club) return;
        if (sections.has('all')) {
            this.refreshClub(true);
            return;
        }
        if (sections.has('club')) this.refreshClub();
        if (sections.has('readings')) { this.loadReadings(); this.loadProgress(); }
        if (sections.has('milestones')) this.loadMilestones();
        if (sections.has('calendar')) this.loadCalendar();
    }

    private onChannelClosed(reason: 'cerrado' | 'error'): void {
        this.channelEndedFor = this.channelSpaceId;
        this.closeChannel();
        if (reason === 'error') return; // Sin canal, el club se sigue leyendo por REST.
        this.actionMessage = 'Ya no eres miembro activo de este club.';
        this.refreshClub();
    }

    loadMilestones(): void {
        this.community.clubMilestones(this.clubId).subscribe({ next: milestones => this.milestones = milestones, error: () => { this.milestones = []; this.setSectionError('hitos'); } });
    }

    createMilestone(): void {
        const title = this.milestoneTitle.trim();
        if (!title || this.isCreatingMilestone) return;
        this.isCreatingMilestone = true;
        this.milestoneError = '';
        this.community.createClubMilestone(this.clubId, {
            Tipo: this.milestoneType,
            Titulo: title,
            ...(this.milestoneReadingId ? { LecturaId: this.milestoneReadingId } : {}),
            ...(this.milestoneStart !== null ? { ReferenciaInicio: this.milestoneStart } : {}),
            ...(this.milestoneEnd !== null ? { ReferenciaFin: this.milestoneEnd } : {}),
            ...(this.milestoneText.trim() ? { ObjetivoTexto: this.milestoneText.trim() } : {}),
            ...(this.milestoneDate ? { FechaOrientativa: new Date(this.milestoneDate).toISOString() } : {})
        }).subscribe({
            next: () => { this.milestoneTitle = ''; this.milestoneText = ''; this.milestoneStart = null; this.milestoneEnd = null; this.milestoneDate = ''; this.isCreatingMilestone = false; this.loadMilestones(); },
            error: error => { this.milestoneError = this.clubMessage(error, 'No se ha podido crear el hito.'); this.isCreatingMilestone = false; }
        });
    }

    loadCalendar(): void {
        this.community.clubCalendar(this.clubId).subscribe({ next: events => this.calendarEvents = events, error: () => { this.calendarEvents = []; this.setSectionError('calendario'); } });
    }

    createCalendarEvent(): void {
        const title = this.calendarTitle.trim();
        if (!title || !this.calendarStart || this.isSavingCalendarEvent) return;
        if (this.calendarEnd && new Date(this.calendarEnd) < new Date(this.calendarStart)) { this.calendarError = 'La fecha final no puede ser anterior al inicio.'; return; }
        this.isSavingCalendarEvent = true;
        this.calendarError = '';
        this.community.createClubCalendarEvent(this.clubId, {
            Titulo: title,
            FechaInicio: new Date(this.calendarStart).toISOString(),
            ...(this.calendarEnd ? { FechaFin: new Date(this.calendarEnd).toISOString() } : {}),
            ...(this.calendarDescription.trim() ? { DescripcionMarkdown: this.calendarDescription.trim() } : {}),
            ...(this.calendarMilestoneId ? { HitoId: this.calendarMilestoneId } : {})
        }).subscribe({
            next: () => { this.calendarTitle = ''; this.calendarDescription = ''; this.calendarStart = ''; this.calendarEnd = ''; this.calendarMilestoneId = null; this.isSavingCalendarEvent = false; this.loadCalendar(); },
            error: error => { this.calendarError = this.clubMessage(error, 'No se ha podido crear el evento.'); this.isSavingCalendarEvent = false; }
        });
    }

    deleteCalendarEvent(event: ClubCalendarEvent): void {
        if (!this.canManageClub || !window.confirm(`¿Quieres eliminar el evento “${event.Titulo}”?`)) return;
        this.community.deleteClubCalendarEvent(this.clubId, event.Id).subscribe({ next: () => this.loadCalendar(), error: error => this.calendarError = this.clubMessage(error, 'No se ha podido eliminar el evento.') });
    }

    // ---- Solicitudes e invitaciones del club (quien puede invitar) ----

    loadJoinRequests(): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId || !this.canInvite || !this.acceptsRequests) {
            this.joinRequests = [];
            return;
        }
        this.spaces.joinRequests(spaceId).subscribe({
            next: requests => { if (this.club?.EspacioId === spaceId) this.joinRequests = requests; },
            error: () => { this.joinRequests = []; this.setSectionError('las solicitudes de acceso'); }
        });
    }

    resolveJoinRequest(request: SolicitudDeEntrada, decision: 'aprobar' | 'rechazar'): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId || this.joinRequestActionIds.has(request.id)) return;
        this.joinRequestActionIds.add(request.id);
        this.membershipError = '';
        this.spaces.resolveJoinRequest(spaceId, request.id, decision).subscribe({
            next: () => {
                this.joinRequestActionIds.delete(request.id);
                this.joinRequests = this.joinRequests.filter(item => item.id !== request.id);
                this.actionMessage = decision === 'aprobar'
                    ? `Solicitud aprobada: ${clubPersonName(request)} aparecerá entre los miembros en cuanto Libros lo sepa.`
                    : 'Solicitud rechazada.';
            },
            error: error => {
                this.joinRequestActionIds.delete(request.id);
                this.membershipError = spaceErrorMessage(error, 'No se ha podido resolver la solicitud.');
                this.loadJoinRequests();
            }
        });
    }


    loadSentInvitations(): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId || !this.canInvite) {
            this.sentInvitations = [];
            return;
        }
        this.spaces.sentInvitations(spaceId).subscribe({
            next: invitations => { if (this.club?.EspacioId === spaceId) this.sentInvitations = invitations; },
            error: () => this.sentInvitations = []
        });
    }

    /** Busca personas de Yosiftware para invitar (de 2 a 60 caracteres). */
    searchPeople(): void {
        const query = this.peopleQuery.trim();
        if (!this.canInvite || this.isSearchingPeople) return;
        if (query.length < 2 || query.length > 60) {
            this.membershipError = 'Escribe entre 2 y 60 caracteres para buscar.';
            return;
        }
        this.isSearchingPeople = true;
        this.membershipError = '';
        this.spaces.searchPeople(query).subscribe({
            next: people => { this.people = people.filter(person => !person.borrada); this.isSearchingPeople = false; this.peopleSearched = true; },
            error: error => { this.people = []; this.isSearchingPeople = false; this.peopleSearched = true; this.membershipError = spaceErrorMessage(error, 'No se han podido buscar personas para invitar.'); }
        });
    }

    /** El nombre de una persona de la búsqueda o de una solicitud. */
    personName(person: { nombre: string | null; alias: string }): string { return clubPersonName(person); }

    /** La miniatura del avatar de una persona de la plataforma (llega relativa a su API). */
    personAvatar(person: PlataformaPersona): string | null { return platformAssetUrl(person.avatar?.miniatura); }

    invitePerson(person: PlataformaPersona): void {
        this.sendInvitation(`cuenta:${person.id}`, { cuenta: person.id }, `Invitación enviada a ${this.personName(person)}.`);
    }

    /** Invitar a un correo: la plataforma envía el correo (y avisa si es de una cuenta). */
    inviteEmail(): void {
        const email = this.invitationEmail.trim();
        if (!EMAIL_PATTERN.test(email)) {
            this.membershipError = 'Escribe un correo válido.';
            return;
        }
        this.sendInvitation(`correo:${email.toLowerCase()}`, { correo: email }, 'Invitación enviada. Le llegará por correo y, si el correo es de una cuenta, también un aviso.', () => this.invitationEmail = '');
    }

    /** Solo la propiedad puede invitar con un rol que gestiona (`moderacion`). */
    get canChooseInvitationRole(): boolean { return this.isOwner; }

    withdrawInvitation(invitation: InvitacionEnviada): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId || this.invitationActionIds.has(invitation.id)) return;
        this.invitationActionIds.add(invitation.id);
        this.membershipError = '';
        this.spaces.withdrawInvitation(spaceId, invitation.id).subscribe({
            next: () => { this.invitationActionIds.delete(invitation.id); this.sentInvitations = this.sentInvitations.filter(item => item.id !== invitation.id); },
            error: error => { this.invitationActionIds.delete(invitation.id); this.membershipError = spaceErrorMessage(error, 'No se ha podido retirar la invitación.'); this.loadSentInvitations(); }
        });
    }

    invitationTarget(invitation: InvitacionEnviada): string {
        return invitation.alias ? `@${invitation.alias}` : invitation.correo || 'Invitación';
    }

    private sendInvitation(key: string, target: { cuenta: string } | { correo: string }, done: string, after?: () => void): void {
        const spaceId = this.club?.EspacioId;
        if (!spaceId || !this.canInvite || this.invitingKeys.has(key)) return;
        this.invitingKeys.add(key);
        this.membershipError = '';
        this.actionMessage = '';
        const role = this.canChooseInvitationRole && this.invitationRole === 'moderacion' ? 'moderacion' : undefined;
        this.spaces.invite(spaceId, target, role).subscribe({
            next: () => {
                this.invitingKeys.delete(key);
                this.actionMessage = done;
                after?.();
                this.loadSentInvitations();
            },
            error: error => { this.invitingKeys.delete(key); this.membershipError = spaceErrorMessage(error, 'No se ha podido enviar la invitación.'); }
        });
    }

    // ---- Denunciar el club y sus publicaciones (la denuncia de Libros) ----

    reportClub(): void {
        if (!this.club || this.isOwner || this.isReportingClub) return;
        const reason = window.prompt('Describe brevemente el motivo de la denuncia (máximo 1.000 caracteres).')?.trim();
        if (!reason) return;
        this.isReportingClub = true;
        this.actionMessage = '';
        this.community.report('club', this.club.Id, reason.slice(0, 1000)).subscribe({ next: () => { this.isReportingClub = false; this.actionMessage = 'Denuncia enviada a moderación.'; }, error: error => { this.isReportingClub = false; this.actionMessage = getApiErrorCode(error) === 'duplicate_content_report' ? 'Ya tienes una denuncia pendiente sobre este club.' : getApiErrorMessage(error, 'No se ha podido enviar la denuncia.'); } });
    }

    loadPublications(reset = true): void {
        if (!this.isMember || this.isLoadingPublications || (!reset && !this.nextPublicationCursor)) return;
        this.isLoadingPublications = true;
        this.publicationError = '';
        this.community.clubPublications(this.clubId, reset ? undefined : this.nextPublicationCursor ?? undefined).subscribe({
            next: page => {
                const known = new Set(reset ? [] : this.publications.map(item => item.Id));
                this.publications = reset ? page.Publicaciones : [...this.publications, ...page.Publicaciones.filter(item => !known.has(item.Id))];
                this.nextPublicationCursor = page.SiguienteCursor;
                this.isLoadingPublications = false;
            },
            error: error => {
                if (reset) this.publications = [];
                this.isLoadingPublications = false;
                this.publicationError = this.clubMessage(error, 'No se han podido cargar las publicaciones.');
            }
        });
    }

    canReportPublication(publication: ClubPublication): boolean { return publication.Autor.Id !== this.session.userId; }

    reportPublication(publication: ClubPublication): void {
        if (!this.canReportPublication(publication) || this.reportingPublicationIds.has(publication.Id)) return;
        const reason = window.prompt('Describe brevemente el motivo de la denuncia (máximo 1.000 caracteres).')?.trim();
        if (!reason) return;
        this.reportingPublicationIds.add(publication.Id);
        this.publicationError = '';
        this.community.report('publicacion', publication.Id, reason.slice(0, 1000)).subscribe({
            next: () => { this.reportingPublicationIds.delete(publication.Id); this.actionMessage = 'Denuncia enviada a moderación.'; },
            error: error => {
                this.reportingPublicationIds.delete(publication.Id);
                this.publicationError = getApiErrorCode(error) === 'duplicate_content_report' ? 'Ya tienes una denuncia pendiente sobre esta publicación.' : getApiErrorMessage(error, 'No se ha podido enviar la denuncia.');
            }
        });
    }

    loadDebates(): void { this.community.clubDebates(this.clubId, this.revealDebateSpoilers).subscribe({ next: debates => this.debates = debates, error: () => { this.debates = []; this.setSectionError('debates'); } }); }
    openDebate(debate: ClubDebate): void { this.community.clubDebate(this.clubId, debate.Id, this.revealDebateSpoilers).subscribe({ next: detail => this.selectedDebate = detail, error: error => this.debateError = this.clubMessage(error, 'No se ha podido abrir el debate.') }); }
    revealSpoilersInDebates(): void { this.revealDebateSpoilers = true; this.loadDebates(); if (this.selectedDebate) this.openDebate(this.selectedDebate.Debate); }
    createDebate(): void {
        const title = this.debateTitle.trim(), content = this.debateContent.trim();
        if (!title || !content) return;
        this.debateError = '';
        this.community.createClubDebate(this.clubId, { Titulo: title, ContenidoMarkdown: content, ...(this.debateReadingId ? { LecturaId: this.debateReadingId } : {}), ...(this.debateSpoilerStart || this.debateSpoilerEnd ? { Spoiler: { PaginaInicio: this.debateSpoilerStart, PaginaFin: this.debateSpoilerEnd } } : {}) }).subscribe({ next: () => { this.debateTitle = ''; this.debateContent = ''; this.debateReadingId = null; this.debateSpoilerStart = null; this.debateSpoilerEnd = null; this.loadDebates(); }, error: error => this.debateError = this.clubMessage(error, 'No se ha podido crear el debate.') });
    }
    commentDebate(): void {
        const content = this.debateComment.trim();
        if (!content || !this.selectedDebate) return;
        this.community.commentClubDebate(this.clubId, this.selectedDebate.Debate.Id, content).subscribe({ next: () => { this.debateComment = ''; this.openDebate(this.selectedDebate!.Debate); }, error: error => this.debateError = this.clubMessage(error, 'No se ha podido comentar el debate.') });
    }

    loadPolls(): void { this.community.clubPolls(this.clubId).subscribe({ next: polls => this.polls = polls, error: () => { this.polls = []; this.setSectionError('encuestas'); } }); }
    createPoll(): void {
        const question = this.pollQuestion.trim();
        const options = this.pollOptions.split('\n').map(option => option.trim()).filter(Boolean);
        if (!question || options.length < 2 || options.length > 10 || !this.pollClosingDate || this.isCreatingPoll) return;
        if (new Date(this.pollClosingDate) <= new Date()) { this.pollError = 'La fecha de cierre debe ser futura.'; return; }
        this.isCreatingPoll = true;
        this.pollError = '';
        this.community.createClubPoll(this.clubId, question, options, new Date(this.pollClosingDate).toISOString()).subscribe({ next: () => { this.pollQuestion = ''; this.pollOptions = ''; this.pollClosingDate = ''; this.isCreatingPoll = false; this.loadPolls(); }, error: error => { this.pollError = this.clubMessage(error, 'No se ha podido crear la encuesta.'); this.isCreatingPoll = false; } });
    }
    votePoll(poll: ClubPoll, optionId: number): void {
        if (poll.Cerrada || this.pollActionIds.has(poll.Id)) return;
        this.pollActionIds.add(poll.Id);
        this.pollError = '';
        this.community.voteClubPoll(this.clubId, poll.Id, optionId, poll.MiVotoVersion ?? undefined).subscribe({
            next: () => { this.pollActionIds.delete(poll.Id); this.loadPolls(); },
            error: error => {
                const code = getApiErrorCode(error);
                if (code === 'club_poll_vote_conflict' || code === 'club_poll_closed') this.loadPolls();
                this.pollError = getProductStateMessage(error, 'No se ha podido guardar el voto.');
                this.pollActionIds.delete(poll.Id);
            }
        });
    }

    private clubMessage(error: unknown, fallback: string): string {
        const code = getApiErrorCode(error);
        if (code === 'club_access_unavailable') {
            // Recién entrado, el feed aún no ha llegado: se espera en lugar de echar a la persona.
            if (this.spaces.isRecentEntry(this.clubId)) {
                if (this.membershipSync === 'idle') this.startMembershipSync();
                return 'Libros aún está terminando de darte acceso a este club.';
            }
            this.closeChannel();
            void this.router.navigate(['/dashboard/community'], { state: { clubAccessRevoked: true } });
            return 'Este club ya no está disponible para tu cuenta.';
        }
        if (['club_reading_not_found', 'club_milestone_not_found', 'club_event_not_found', 'club_member_not_found'].includes(code || ''))
            this.load();
        return getProductStateMessage(error, fallback);
    }

    private setSectionError(section: string): void {
        this.sectionError = `No se ha podido cargar ${section}. Puedes reintentar la carga del club.`;
    }

    selectProgressReading(): void { this.applyProgressForSelectedReading(); }

    saveProgress(): void {
        if (!this.progressReadingId || this.isSavingProgress) return;
        this.isSavingProgress = true;
        this.progressError = '';
        this.community.saveClubProgress(this.clubId, { LecturaId: this.progressReadingId, PaginaActual: this.progressPage, CapituloActual: this.progressChapter.trim() || null, Compartir: this.progressShared }).subscribe({
            next: () => { this.isSavingProgress = false; this.loadProgress(); },
            error: error => { this.progressError = this.clubMessage(error, 'No se ha podido guardar el progreso.'); this.isSavingProgress = false; }
        });
    }

    readingLabel(reading: ClubReading): string {
        const labels: Record<ClubReading['Objetivo']['Tipo'], string> = { libro: 'Libro', saga: 'Saga', universo: 'Universo', antologia: 'Antología' };
        if (reading.ObjetivoTexto) return reading.ObjetivoTexto;
        const id = reading.Objetivo.Id;
        const named = id ? (reading.Objetivo.Tipo === 'libro' ? this.universeStore.getAllBooks()
            : reading.Objetivo.Tipo === 'antologia' ? this.universeStore.getAllAnthologies()
                : reading.Objetivo.Tipo === 'saga' ? this.universeStore.getAllSagas()
                    : this.universeStore.getUniverses()).find(item => item.Id === id) : null;
        return named?.Nombre || `${labels[reading.Objetivo.Tipo]} no disponible`;
    }

    private applyProgressForSelectedReading(): void {
        const progress = this.progress.find(item => item.LecturaId === this.progressReadingId);
        this.progressPage = progress?.PaginaActual ?? null;
        this.progressChapter = progress?.CapituloActual ?? '';
        this.progressShared = progress?.Compartir ?? false;
    }

    private loadClubReadingAuthors(): void {
        this.clubReadingAuthors = [];
        if (!this.club || this.club.Visibilidad !== 'abierto') return;
        const clubId = this.club.Id;
        this.statisticsSrv.getClubReadingStatistics(clubId).subscribe({
            next: stats => { if (this.club?.Id === clubId) this.clubReadingAuthors = communityReadingRows(stats.AutoresMasLeidos ?? []); },
            error: () => this.clubReadingAuthors = []
        });
    }
}
