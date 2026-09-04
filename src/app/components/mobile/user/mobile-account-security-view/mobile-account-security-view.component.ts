import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AccessMethodName } from '../../../../interfaces/auth';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';

@Component({
    selector: 'app-mobile-account-security-view',
    standalone: true,
    imports: [DatePipe, TitleCasePipe, FormsModule, ReactiveFormsModule, MatIconModule],
    templateUrl: './mobile-account-security-view.component.html',
    styleUrl: './mobile-account-security-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileAccountSecurityViewComponent {
    @Input({ required: true }) controller!: AccountSecurityComponent;

    unlink(method: AccessMethodName): void {
        this.controller.unlink(method);
    }
}
