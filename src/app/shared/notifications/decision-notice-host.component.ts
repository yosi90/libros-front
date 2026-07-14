import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, HostListener } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DecisionNotice, DecisionNoticeAction } from '../../interfaces/session-notification';
import { DecisionNoticeService } from '../../services/navigation/decision-notice.service';

@Component({
    standalone: true,
    selector: 'app-decision-notice-host',
    imports: [A11yModule, AsyncPipe, NgClass, NgFor, NgIf, MatIconModule],
    templateUrl: './decision-notice-host.component.html',
    styleUrl: './decision-notice-host.component.sass'
})
export class DecisionNoticeHostComponent {
    readonly notice$ = this.decisions.notice$;
    constructor(private decisions: DecisionNoticeService) { }

    @HostListener('document:keydown.escape') onEscape(): void { this.decisions.close(); }
    closeFromBackdrop(notice: DecisionNotice): void { if (notice.dismissible) this.decisions.close(); }
    run(action: DecisionNoticeAction): void { void this.decisions.run(action); }
}
