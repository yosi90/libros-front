import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { revealActiveTab } from '../../ui/reveal-active-tab';
import { AccountSecuritySection, accountSecuritySections, isAccountSecuritySection } from '../../../shared/user-pages/account-security/account-security-sections';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';

/**
 * Vista Web de Cuenta y seguridad. La confirmación de identidad se pide solo al
 * guardar un cambio sensible (como en Mobile) y la acción continúa después.
 */
@Component({
    selector: 'app-web-account-security-view',
    standalone: true,
    imports: [A11yModule, DatePipe, TitleCasePipe, FormsModule, ReactiveFormsModule, MatIconModule],
    templateUrl: './web-account-security-view.component.html',
    styleUrl: './web-account-security-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebAccountSecurityViewComponent implements OnInit, AfterViewInit {
    @Input({ required: true }) controller!: AccountSecurityComponent;

    readonly sections = accountSecuritySections;

    activeSection: AccountSecuritySection = 'access';

    constructor(private route: ActivatedRoute, private host: ElementRef<HTMLElement>) { }

    ngOnInit(): void {
        // Dentro del Perfil el apartado llega en `tab`; en la ruta propia, en `section`.
        const params = this.route.snapshot.queryParamMap;
        const requested = params.get('tab') ?? params.get('section');
        if (isAccountSecuritySection(requested))
            this.activeSection = requested;
    }

    ngAfterViewInit(): void {
        revealActiveTab(this.host.nativeElement);
    }

    get activeInfo() {
        return this.sections.find(section => section.id === this.activeSection)!;
    }

    badge(section: AccountSecuritySection): string {
        return this.controller.sectionBadge(section);
    }

    select(section: AccountSecuritySection): void {
        this.activeSection = section;
        requestAnimationFrame(() => revealActiveTab(this.host.nativeElement));
    }

    @HostListener('document:keydown.escape')
    closeReauthenticationOnEscape(): void {
        if (this.controller.reauthenticationSurfaceOpen)
            this.controller.cancelReauthentication();
    }
}
