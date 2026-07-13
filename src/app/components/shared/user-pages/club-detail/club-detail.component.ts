import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClubCalendarEvent, ClubDebate, ClubDebateDetail, ClubDetail, ClubJoinRequest, ClubMember, ClubMilestone, ClubPoll, ClubProgress, ClubReading } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { getApiErrorCode, getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { SessionService } from '../../../../services/auth/session.service';
import { RealtimeSocketService } from '../../../../services/realtime/realtime-socket.service';
import { Subscription } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-club-detail',
    imports: [DatePipe, FormsModule, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './club-detail.component.html',
    styleUrl: './club-detail.component.sass'
})
export class ClubDetailComponent implements OnInit, OnDestroy {
    club: ClubDetail | null = null;
    isLoading = true;
    error = '';
    sectionError = '';
    isJoining = false;
    isOpeningChat = false;
    actionMessage = '';
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
    joinRequests: ClubJoinRequest[] = [];
    joinRequestActionIds = new Set<number>();
    inviteUserId: number | null = null;
    isInviting = false;
    membershipError = '';
    isReportingClub = false;
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
    private realtimeSubscription: Subscription | null = null;
    private clubId = 0;

    constructor(private route: ActivatedRoute, private community: CommunityService, private session: SessionService, private router: Router, private realtime: RealtimeSocketService) { }

    ngOnInit(): void {
        this.clubId = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isInteger(this.clubId) || this.clubId < 1) {
            this.isLoading = false;
            this.error = 'El club solicitado no es válido.';
            return;
        }
        this.load();
        this.realtime.open('community');
        this.realtimeSubscription = this.realtime.events$.subscribe(event => {
            if (event.channel !== 'community') return;
            if (event.type.startsWith('club.') && this.eventClubId(event.payload) === this.clubId) this.reconcileClubAccess();
        });
        this.realtimeSubscription.add(this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected) this.reconcileClubAccess();
        }));
        this.realtimeSubscription.add(this.community.blockedUserIds$.subscribe(() => this.reconcileClubAccess()));
    }

    ngOnDestroy(): void { this.realtimeSubscription?.unsubscribe(); }

    load(): void {
        this.isLoading = true;
        this.error = '';
        this.community.club(this.clubId).subscribe({
            next: club => { this.club = club; this.isLoading = false; this.loadReadings(); this.loadProgress(); this.loadMilestones(); this.loadCalendar(); this.loadDebates(); this.loadPolls(); if (this.canManageClub) this.loadJoinRequests(); },
            error: error => {
                if (getApiErrorCode(error) === 'club_access_unavailable') {
                    void this.router.navigate(['/dashboard/community'], { state: { clubAccessRevoked: true } });
                    return;
                }
                this.error = getProductStateMessage(error, 'No se ha podido cargar este club.');
                this.isLoading = false;
            }
        });
    }

    joinOrRequest(): void {
        if (!this.club || this.isJoining) return;
        this.isJoining = true;
        this.actionMessage = '';
        const request = this.club.Visibilidad === 'abierto'
            ? this.community.joinClub(this.club.Id)
            : this.community.requestClubAccess(this.club.Id);
        request.subscribe({
            next: () => {
                if (this.club?.Visibilidad === 'abierto') {
                    this.isJoining = false;
                    this.openClubChat();
                    return;
                }
                this.actionMessage = 'Tu solicitud de acceso se ha enviado.';
                this.isJoining = false;
                this.load();
            },
            error: error => { this.actionMessage = getProductStateMessage(error, 'No se ha podido completar la solicitud.'); this.isJoining = false; }
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

    get isMember(): boolean {
        return this.club?.MiembrosDetalle.some(member => member.Id === this.session.userId) === true;
    }

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

    leaveClub(): void {
        if (!this.club || !this.isMember || this.isOwner || this.isLeaving || !window.confirm('¿Quieres abandonar este club? Perderás acceso inmediato a su chat y contenido privado.')) return;
        this.isLeaving = true;
        this.actionMessage = '';
        this.community.leaveClub(this.club.Id).subscribe({
            next: () => void this.router.navigate(['/dashboard/community']),
            error: error => { this.actionMessage = this.clubMessage(error, 'No se ha podido abandonar el club.'); this.isLeaving = false; }
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

    openClubChat(): void {
        if (!this.club || this.isOpeningChat) return;
        this.isOpeningChat = true;
        this.actionMessage = '';
        this.community.prepareClubConversation(this.club.Id).subscribe({
            next: conversationId => void this.router.navigate(['/dashboard/chat', conversationId]),
            error: error => { this.actionMessage = this.clubMessage(error, 'No se ha podido abrir la conversación del club.'); this.isOpeningChat = false; }
        });
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

    loadJoinRequests(): void {
        this.community.clubJoinRequests(this.clubId).subscribe({ next: page => this.joinRequests = page.Solicitudes, error: () => { this.joinRequests = []; this.setSectionError('solicitudes de acceso'); } });
    }

    resolveJoinRequest(request: ClubJoinRequest, state: 'aceptada' | 'rechazada'): void {
        if (this.joinRequestActionIds.has(request.Id)) return;
        this.joinRequestActionIds.add(request.Id);
        this.membershipError = '';
        this.community.resolveClubJoinRequest(this.clubId, request.Id, state).subscribe({
            next: () => { this.joinRequestActionIds.delete(request.Id); this.loadJoinRequests(); this.load(); },
            error: error => { this.membershipError = this.clubLimitMessage(error) || this.clubMessage(error, 'No se ha podido resolver la solicitud.'); this.joinRequestActionIds.delete(request.Id); }
        });
    }

    inviteUser(): void {
        if (!this.inviteUserId || this.isInviting || !this.canManageClub) return;
        this.isInviting = true;
        this.membershipError = '';
        this.community.inviteToClub(this.clubId, this.inviteUserId).subscribe({
            next: () => { this.inviteUserId = null; this.isInviting = false; this.actionMessage = 'Invitación enviada.'; },
            error: error => { this.membershipError = this.clubMessage(error, 'No se ha podido enviar la invitación.'); this.isInviting = false; }
        });
    }

    reportClub(): void {
        if (!this.club || this.isOwner || this.isReportingClub) return;
        const reason = window.prompt('Describe brevemente el motivo de la denuncia (máximo 1.000 caracteres).')?.trim();
        if (!reason) return;
        this.isReportingClub = true;
        this.actionMessage = '';
        this.community.report('club', this.club.Id, reason.slice(0, 1000)).subscribe({ next: () => { this.isReportingClub = false; this.actionMessage = 'Denuncia enviada a moderación.'; }, error: error => { this.isReportingClub = false; this.actionMessage = getApiErrorCode(error) === 'duplicate_content_report' ? 'Ya tienes una denuncia pendiente sobre este club.' : getApiErrorMessage(error, 'No se ha podido enviar la denuncia.'); } });
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

    private reconcileClubAccess(): void {
        this.community.club(this.clubId).subscribe({
            next: club => { this.club = club; this.loadReadings(); this.loadProgress(); this.loadMilestones(); this.loadCalendar(); this.loadDebates(); this.loadPolls(); if (this.canManageClub) this.loadJoinRequests(); },
            error: () => {
                this.club = null;
                void this.router.navigate(['/dashboard/community'], { state: { clubAccessRevoked: true } });
            }
        });
    }

    private eventClubId(payload: Record<string, unknown>): number | null {
        const value = payload['ClubId'];
        return typeof value === 'number' && Number.isInteger(value) ? value : null;
    }

    private clubLimitMessage(error: unknown): string | null {
        const code = getApiErrorCode(error);
        if (code === 'club_owner_limit_reached') return 'La persona ya administra un club propio.';
        if (code === 'club_membership_limit_reached') return 'La persona ya participa en tres clubes activos.';
        return null;
    }

    private clubMessage(error: unknown, fallback: string): string {
        const code = getApiErrorCode(error);
        if (code === 'club_access_unavailable') {
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
        return reading.ObjetivoTexto || `${labels[reading.Objetivo.Tipo]} #${reading.Objetivo.Id ?? 'sin referencia'}`;
    }

    private applyProgressForSelectedReading(): void {
        const progress = this.progress.find(item => item.LecturaId === this.progressReadingId);
        this.progressPage = progress?.PaginaActual ?? null;
        this.progressChapter = progress?.CapituloActual ?? '';
        this.progressShared = progress?.Compartir ?? false;
    }
}
