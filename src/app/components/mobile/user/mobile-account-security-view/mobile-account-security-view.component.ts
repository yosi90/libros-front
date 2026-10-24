import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

@Component({
    selector: 'app-mobile-account-security-view',
    standalone: true,
    imports: [MatIconModule, YosiftwareMarkComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './mobile-account-security-view.component.html',
    styleUrl: './mobile-account-security-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileAccountSecurityViewComponent {
    @Input({ required: true }) controller!: AccountSecurityComponent;
}
