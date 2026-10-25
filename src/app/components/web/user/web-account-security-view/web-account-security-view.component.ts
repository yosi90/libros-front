import { AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Input, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { revealActiveTab } from '../../ui/reveal-active-tab';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';
import { AccountSecuritySection, accountSecuritySections, resolveAccountSecuritySection } from '../../../shared/user-pages/account-security/account-security-sections';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';

/**
 * Vista Web de Cuenta y seguridad. Lo de entrar (contraseña, correo, formas de
 * acceso y dispositivos) es de la cuenta de Yosiftware y solo se enlaza.
 */
@Component({
    selector: 'app-web-account-security-view',
    standalone: true,
    imports: [MatIconModule, YosiftwareMarkComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './web-account-security-view.component.html',
    styleUrl: './web-account-security-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebAccountSecurityViewComponent implements OnInit, AfterViewInit {
    @Input({ required: true }) controller!: AccountSecurityComponent;

    readonly sections = accountSecuritySections;

    activeSection: AccountSecuritySection = 'account';

    constructor(private route: ActivatedRoute, private host: ElementRef<HTMLElement>) { }

    ngOnInit(): void {
        // Dentro del Perfil el apartado llega en `tab`; en la ruta propia, en `section`.
        const params = this.route.snapshot.queryParamMap;
        const requested = resolveAccountSecuritySection(params.get('tab') ?? params.get('section'));
        if (requested)
            this.activeSection = requested;
    }

    ngAfterViewInit(): void {
        revealActiveTab(this.host.nativeElement);
    }

    get activeInfo() {
        return this.sections.find(section => section.id === this.activeSection)!;
    }

    select(section: AccountSecuritySection): void {
        this.activeSection = section;
        requestAnimationFrame(() => revealActiveTab(this.host.nativeElement));
    }
}
