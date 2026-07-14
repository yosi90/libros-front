import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ClubAccessContext, ClubAccessDirection, ClubAccessInboxCounters, ClubAccessUser, ClubInboxCursor, ClubInboxFilterState, ClubInboxState, ClubInvitation, ClubInvitationPage, ClubInvitationSent, ClubJoinRequestOwn, ClubJoinRequestOwnPage, ClubJoinRequestReceived } from '../../../../../interfaces/community';
import { CommunityService } from '../../../../../services/entities/community.service';
import { getProductStateMessage } from '../../../../../shared/api-error-message';

type ClubAccessKind = 'solicitudes' | 'invitaciones';

interface ClubAccessRow {
    Id: number;
    Club: ClubAccessContext;
    Persona: ClubAccessUser | null;
    PersonaSecundaria: ClubAccessUser | null;
    Mensaje: string | null;
    Estado: ClubInboxState;
    FechaCreacion: string;
    FechaResolucion: string | null;
}

@Component({
    standalone: true,
    selector: 'app-club-access-center',
    imports: [DatePipe, FormsModule, MatIconModule, MatTooltipModule, NgFor, NgIf, RouterLink],
    templateUrl: './club-access-center.component.html',
    styleUrl: './club-access-center.component.sass'
})
export class ClubAccessCenterComponent implements OnInit, OnChanges {
    @Input() counters: ClubAccessInboxCounters = this.emptyCounters();
    @Input() refreshToken = 0;
    @Output() accessChanged = new EventEmitter<void>();

    kind: ClubAccessKind = 'solicitudes';
    direction: ClubAccessDirection = 'enviadas';
    state: ClubInboxFilterState = 'pendiente';
    rows: ClubAccessRow[] = [];
    nextCursor: ClubInboxCursor | null = null;
    isLoading = false;
    error = '';
    actionIds = new Set<number>();
    private initialized = false;

    readonly states: { value: ClubInboxFilterState; label: string }[] = [
        { value: 'pendiente', label: 'Pendientes' },
        { value: 'aceptada', label: 'Aceptadas' },
        { value: 'rechazada', label: 'Rechazadas' },
        { value: 'cancelada', label: 'Canceladas' },
        { value: 'todas', label: 'Todas' }
    ];

    constructor(private community: CommunityService, private route: ActivatedRoute, private router: Router) { }

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        const kind = params.get('accessType');
        const direction = params.get('direction');
        const state = params.get('status');
        if (kind === 'solicitudes' || kind === 'invitaciones') this.kind = kind;
        if (direction === 'enviadas' || direction === 'recibidas') this.direction = direction;
        if (this.states.some(option => option.value === state)) this.state = state as ClubInboxFilterState;
        this.initialized = true;
        this.load();
        this.syncUrl();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.initialized && changes['refreshToken'] && !changes['refreshToken'].firstChange) this.load();
    }

    get pendingTotal(): number {
        const source = this.kind === 'solicitudes' ? this.counters.Solicitudes : this.counters.Invitaciones;
        return source.EnviadasPendientes + source.RecibidasPendientes;
    }

    pendingFor(direction: ClubAccessDirection): number {
        const source = this.kind === 'solicitudes' ? this.counters.Solicitudes : this.counters.Invitaciones;
        return direction === 'enviadas' ? source.EnviadasPendientes : source.RecibidasPendientes;
    }

    selectKind(kind: ClubAccessKind): void {
        if (this.kind === kind) return;
        this.kind = kind;
        this.state = 'pendiente';
        this.changeView();
    }

    selectDirection(direction: ClubAccessDirection): void {
        if (this.direction === direction) return;
        this.direction = direction;
        this.state = 'pendiente';
        this.changeView();
    }

    selectState(state: ClubInboxFilterState): void {
        if (this.state === state) return;
        this.state = state;
        this.changeView();
    }

    loadMore(): void {
        if (!this.nextCursor || this.isLoading) return;
        this.load(this.nextCursor);
    }

    accept(row: ClubAccessRow): void { this.resolve(row, 'aceptada'); }
    reject(row: ClubAccessRow): void { this.resolve(row, 'rechazada'); }
    cancel(row: ClubAccessRow): void { this.resolve(row, 'cancelada'); }

    stateLabel(state: ClubInboxState): string {
        return { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada', cancelada: 'Cancelada' }[state];
    }

    personLabel(row: ClubAccessRow): string {
        if (!row.Persona) return this.direction === 'enviadas' ? 'Solicitud propia' : 'Persona no disponible';
        if (this.kind === 'invitaciones' && this.direction === 'enviadas' && row.PersonaSecundaria) return `${row.Persona.Nombre} · invitada por ${row.PersonaSecundaria.Nombre}`;
        return row.Persona.Nombre;
    }

    private changeView(): void {
        this.syncUrl();
        this.load();
    }

    private load(cursor?: ClubInboxCursor): void {
        if (this.isLoading) return;
        this.isLoading = true;
        this.error = '';
        const request = (this.kind === 'solicitudes'
            ? this.community.ownClubJoinRequests(this.direction, this.state, cursor)
            : this.community.clubInvitations(this.direction, this.state, cursor)) as Observable<ClubJoinRequestOwnPage | ClubInvitationPage>;

        request.subscribe({
            next: page => {
                const items = 'Solicitudes' in page
                    ? page.Solicitudes.map(item => this.requestRow(item))
                    : page.Invitaciones.map(item => this.invitationRow(item));
                if (cursor) {
                    const known = new Set(this.rows.map(row => row.Id));
                    this.rows = [...this.rows, ...items.filter(row => !known.has(row.Id))];
                } else this.rows = items;
                this.nextCursor = page.SiguienteCursor;
                this.isLoading = false;
            },
            error: error => {
                if (!cursor) this.rows = [];
                this.error = getProductStateMessage(error, 'No se ha podido cargar esta bandeja.');
                this.isLoading = false;
            }
        });
    }

    private resolve(row: ClubAccessRow, state: 'aceptada' | 'rechazada' | 'cancelada'): void {
        if (row.Estado !== 'pendiente' || this.actionIds.has(row.Id) || this.isLoading) return;
        this.actionIds.add(row.Id);
        this.error = '';
        const request = state === 'cancelada'
            ? this.kind === 'solicitudes'
                ? this.community.cancelOwnClubJoinRequest(row.Id)
                : this.community.cancelClubInvitation(row.Id)
            : this.kind === 'solicitudes'
                ? this.community.resolveClubJoinRequest(row.Club.Id, row.Id, state)
                : this.community.resolveClubInvitation(row.Club.Id, row.Id, state);

        request.subscribe({
            next: () => this.finishAction(),
            error: error => {
                this.actionIds.delete(row.Id);
                this.error = getProductStateMessage(error, 'No se ha podido actualizar el acceso. La bandeja se ha reconciliado.');
                this.load();
                this.accessChanged.emit();
            }
        });
    }

    private finishAction(): void {
        this.actionIds.clear();
        this.load();
        this.accessChanged.emit();
    }

    private requestRow(item: ClubJoinRequestOwn | ClubJoinRequestReceived): ClubAccessRow {
        return {
            ...item,
            Persona: 'Solicitante' in item ? item.Solicitante : null,
            PersonaSecundaria: null
        };
    }

    private invitationRow(item: ClubInvitation | ClubInvitationSent): ClubAccessRow {
        return {
            ...item,
            Persona: 'Invitado' in item ? item.Invitado : item.Invitador,
            PersonaSecundaria: 'Invitado' in item ? item.Invitador : null,
            Mensaje: null
        };
    }

    private syncUrl(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { clubTab: 'access', accessType: this.kind, direction: this.direction, status: this.state },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    private emptyCounters(): ClubAccessInboxCounters {
        return {
            Solicitudes: { EnviadasPendientes: 0, RecibidasPendientes: 0 },
            Invitaciones: { EnviadasPendientes: 0, RecibidasPendientes: 0 }
        };
    }
}
