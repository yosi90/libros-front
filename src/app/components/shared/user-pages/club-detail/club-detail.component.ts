import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClubDetail } from '../../../../interfaces/community';
import { CommunityService } from '../../../../services/entities/community.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';

@Component({
    standalone: true,
    selector: 'app-club-detail',
    imports: [NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './club-detail.component.html',
    styleUrl: './club-detail.component.sass'
})
export class ClubDetailComponent implements OnInit {
    club: ClubDetail | null = null;
    isLoading = true;
    error = '';
    isJoining = false;
    actionMessage = '';
    private clubId = 0;

    constructor(private route: ActivatedRoute, private community: CommunityService) { }

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
            next: club => { this.club = club; this.isLoading = false; },
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
}
