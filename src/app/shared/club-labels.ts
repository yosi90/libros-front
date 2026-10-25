// Las etiquetas de los valores de los clubes, para todas las vistas: la móvil enseñaba los valores tal cual
// (`disponible`, `propietario`, `abierto`, `pagina`).

/** Las solicitudes pendientes son de la plataforma: `EstadoMembresia` ya no vale `solicitud_pendiente` (fase 4). */
const membershipLabels: Record<string, string> = {
    disponible: 'puedes unirte',
    miembro: 'ya eres miembro'
};

export const clubRoleLabels: Record<string, string> = {
    propietario: 'Propietario',
    moderador: 'Moderador',
    miembro: 'Miembro'
};

const visibilityLabels: Record<string, string> = { abierto: 'Abierto', cerrado: 'Cerrado' };

const milestoneTypeLabels: Record<string, string> = { pagina: 'Página', capitulo: 'Capítulo', evento: 'Evento' };

export function clubMembershipLabel(state: string | null | undefined): string {
    return state ? membershipLabels[state] ?? state : '';
}

export function clubRoleLabel(role: string | null | undefined): string {
    return role ? clubRoleLabels[role] ?? role : '';
}

export function clubVisibilityLabel(visibility: string | null | undefined): string {
    return visibility ? visibilityLabels[visibility] ?? visibility : '';
}

export function clubMilestoneTypeLabel(type: string | null | undefined): string {
    return type ? milestoneTypeLabels[type] ?? type : '';
}

/** «1 voto» y «3 votos». */
export function clubVotesLabel(total: number): string {
    return total === 1 ? '1 voto' : `${total} votos`;
}
