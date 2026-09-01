import { AsyncPipe, NgClass } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, HostBinding, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DecisionNotice, DecisionNoticeAction } from '../../interfaces/session-notification';
import { DecisionNoticeService } from '../../services/navigation/decision-notice.service';
import { PresentationModeService } from '../../services/ui/presentation-mode.service';

@Component({
    standalone: true,
    selector: 'app-decision-notice-host',
    imports: [A11yModule, AsyncPipe, NgClass, MatIconModule],
    templateUrl: './decision-notice-host.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './decision-notice-host.component.sass'
})
export class DecisionNoticeHostComponent {
    readonly notice$ = this.decisions.notice$;
    constructor(private decisions: DecisionNoticeService, private presentation: PresentationModeService) { }

    @HostBinding('class.decision-host--mobile')
    get mobileHost(): boolean { return this.isMobilePresentation; }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }

    @HostListener('document:keydown.escape') onEscape(): void { this.decisions.close(); }
    closeFromBackdrop(notice: DecisionNotice): void { if (!this.isMobilePresentation && notice.dismissible) this.decisions.close(); }
    close(): void { this.decisions.close(); }
    run(action: DecisionNoticeAction): void { void this.decisions.run(action); }
}
