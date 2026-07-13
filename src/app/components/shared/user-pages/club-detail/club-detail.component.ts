import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClubDetail, ClubMilestone, ClubProgress, ClubReading } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { SessionService } from '../../../../services/auth/session.service';

@Component({
    standalone: true,
    selector: 'app-club-detail',
    imports: [DatePipe, FormsModule, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './club-detail.component.html',
    styleUrl: './club-detail.component.sass'
})
export class ClubDetailComponent implements OnInit {
    club: ClubDetail | null = null;
    isLoading = true;
    error = '';
    isJoining = false;
    actionMessage = '';
    readings: ClubReading[] = [];
    isReadingsLoading = false;
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
    private clubId = 0;

    constructor(private route: ActivatedRoute, private community: CommunityService, private session: SessionService) { }

    ngOnInit(): void {
        this.clubId = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isInteger(this.clubId) || this.clubId < 1) {
            this.isLoading = false;
            this.error = 'El club solicitado no es válido.';
            return;
        }
        this.load();
    }

    load(): void {
        this.isLoading = true;
        this.error = '';
        this.community.club(this.clubId).subscribe({
            next: club => { this.club = club; this.isLoading = false; this.loadReadings(); this.loadProgress(); this.loadMilestones(); },
            error: error => { this.error = getApiErrorMessage(error, 'No se ha podido cargar este club.'); this.isLoading = false; }
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
                this.actionMessage = this.club?.Visibilidad === 'abierto'
                    ? 'Ya formas parte del club. El acceso al chat se actualizará al abrirlo.'
                    : 'Tu solicitud de acceso se ha enviado.';
                this.isJoining = false;
                this.load();
            },
            error: error => { this.actionMessage = getApiErrorMessage(error, 'No se ha podido completar la solicitud.'); this.isJoining = false; }
        });
    }

    loadReadings(): void {
        this.isReadingsLoading = true;
        this.community.clubReadings(this.clubId).subscribe({
            next: readings => { this.readings = readings; this.isReadingsLoading = false; },
            error: () => { this.readings = []; this.isReadingsLoading = false; }
        });
    }

    loadProgress(): void {
        this.community.clubProgress(this.clubId).subscribe({
            next: progress => { this.progress = progress; this.applyProgressForSelectedReading(); },
            error: () => { this.progress = []; }
        });
    }

    get canManageClub(): boolean {
        if (!this.club) return false;
        return this.club.PropietarioId === this.session.userId || this.club.MiembrosDetalle.some(member => member.Id === this.session.userId && member.Rol === 'moderador');
    }

    loadMilestones(): void {
        this.community.clubMilestones(this.clubId).subscribe({ next: milestones => this.milestones = milestones, error: () => this.milestones = [] });
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
            error: error => { this.milestoneError = getApiErrorMessage(error, 'No se ha podido crear el hito.'); this.isCreatingMilestone = false; }
        });
    }

    selectProgressReading(): void { this.applyProgressForSelectedReading(); }

    saveProgress(): void {
        if (!this.progressReadingId || this.isSavingProgress) return;
        this.isSavingProgress = true;
        this.progressError = '';
        this.community.saveClubProgress(this.clubId, { LecturaId: this.progressReadingId, PaginaActual: this.progressPage, CapituloActual: this.progressChapter.trim() || null, Compartir: this.progressShared }).subscribe({
            next: () => { this.isSavingProgress = false; this.loadProgress(); },
            error: error => { this.progressError = getApiErrorMessage(error, 'No se ha podido guardar el progreso.'); this.isSavingProgress = false; }
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
