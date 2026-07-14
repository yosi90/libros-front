import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DecisionNoticeService } from './decision-notice.service';

export type PolicyBlockCode = 'usage_policy_acceptance_required' | 'creation_policy_acceptance_required';

@Injectable({ providedIn: 'root' })
export class PolicyPromptService {
    static readonly noticeId = 'community-policies';

    constructor(private decisions: DecisionNoticeService, private router: Router) { }

    trigger(code: PolicyBlockCode): void {
        const creation = code === 'creation_policy_acceptance_required';
        this.decisions.show({
            id: PolicyPromptService.noticeId,
            type: 'system',
            icon: 'policy',
            title: creation ? 'Normas de creación pendientes' : 'Normas de comunidad pendientes',
            message: creation ? 'Debes revisar y aceptar las normas de creación antes de publicar contenido.' : 'Debes revisar y aceptar las normas de uso antes de continuar con las funciones sociales.',
            dismissible: true,
            actions: [
                { id: 'review', label: 'Revisar ahora', appearance: 'primary', showInCenter: true, execute: () => this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'policies' } }) },
                { id: 'later', label: 'Más tarde', appearance: 'secondary', execute: () => void 0 }
            ]
        }, 'community-policies-dialog');
    }

    clear(): void { this.decisions.remove(PolicyPromptService.noticeId); }
}
