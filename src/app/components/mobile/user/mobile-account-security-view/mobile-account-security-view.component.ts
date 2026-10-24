import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

@Component({
    selector: 'app-mobile-account-security-view',
    standalone: true,
    imports: [DatePipe, FormsModule, ReactiveFormsModule, MatIconModule, YosiftwareMarkComponent],
    templateUrl: './mobile-account-security-view.component.html',
    styleUrl: './mobile-account-security-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileAccountSecurityViewComponent {
    @Input({ required: true }) controller!: AccountSecurityComponent;
}
