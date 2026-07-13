import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { SocialSummary } from '../../../../interfaces/chat';
import { CommunityService } from '../../../../services/entities/community.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';

interface SummaryCard { label: string; value: number; icon: string; path: string; accent?: boolean }

@Component({
    standalone: true,
    selector: 'app-social-summary',
    imports: [NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './social-summary.component.html',
    styleUrl: './social-summary.component.sass'
})
export class SocialSummaryComponent implements OnInit {
    summary: SocialSummary | null = null;
    cards: SummaryCard[] = [];
    loading = false;
    error = '';

    constructor(private community: CommunityService) { }

    ngOnInit(): void { this.load(); }

    trackCard(_index: number, card: SummaryCard): string { return card.label; }

    private buildCards(summary: SocialSummary): SummaryCard[] {
        const value = summary.Resumen;
        return [
            { label: 'Amistades', value: value.Relaciones.Amistades, icon: 'group', path: '../friendships' },
            { label: 'Solicitudes pendientes', value: value.Relaciones.SolicitudesRecibidasPendientes, icon: 'person_add', path: '../friendships', accent: value.Relaciones.SolicitudesRecibidasPendientes > 0 },
            { label: 'Seguidores', value: value.Relaciones.Seguidores, icon: 'diversity_3', path: '../friendships' },
            { label: 'Siguiendo', value: value.Relaciones.Seguidos, icon: 'person_search', path: '../friendships' },
            { label: 'Clubes activos', value: value.Clubes.Activos, icon: 'groups_3', path: '../clubs' },
            { label: 'Invitaciones a clubes', value: value.Clubes.InvitacionesPendientes, icon: 'mark_email_unread', path: '../clubs', accent: value.Clubes.InvitacionesPendientes > 0 },
            { label: 'Mensajes humanos', value: value.Mensajes.NoLeidosHumanos, icon: 'forum', path: '../messages', accent: value.Mensajes.NoLeidosHumanos > 0 },
            { label: 'Avisos de Yosiftware', value: value.Mensajes.NoLeidosSistema, icon: 'campaign', path: '../messages', accent: value.Mensajes.NoLeidosSistema > 0 }
        ];
    }

    load(): void {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        this.community.socialSummary().subscribe({
            next: summary => { this.summary = summary; this.cards = this.buildCards(summary); this.loading = false; },
            error: error => { this.summary = null; this.cards = []; this.error = getApiErrorMessage(error, 'No se ha podido cargar el resumen social.'); this.loading = false; }
        });
    }
}
