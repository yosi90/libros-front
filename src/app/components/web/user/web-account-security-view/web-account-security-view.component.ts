import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { revealActiveTab } from '../../ui/reveal-active-tab';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';

export type AccountSecuritySection = 'access' | 'credentials' | 'devices' | 'policies' | 'moderation' | 'blocks';

/**
 * Vista Web de Cuenta y seguridad. La confirmación de identidad se pide solo al
 * guardar un cambio sensible (como en Mobile) y la acción continúa después.
 */
@Component({
    selector: 'app-web-account-security-view',
    standalone: true,
    imports: [A11yModule, DatePipe, TitleCasePipe, FormsModule, ReactiveFormsModule, MatIconModule, RouterLink],
    templateUrl: './web-account-security-view.component.html',
    styleUrl: './web-account-security-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebAccountSecurityViewComponent implements OnInit, AfterViewInit {
    @Input({ required: true }) controller!: AccountSecurityComponent;

    readonly sections: ReadonlyArray<{ id: AccountSecuritySection; label: string; icon: string; description: string }> = [
        { id: 'access', label: 'Métodos de acceso', icon: 'key', description: 'Formas de entrar en tu cuenta. Conserva al menos una que puedas recuperar.' },
        { id: 'credentials', label: 'Contraseña y correo', icon: 'password', description: 'Te pediremos confirmar tu identidad solo al guardar un cambio.' },
        { id: 'devices', label: 'Dispositivos', icon: 'devices', description: 'Sesiones que todavía pueden acceder a tu cuenta.' },
        { id: 'policies', label: 'Normas de comunidad', icon: 'policy', description: 'Consulta y acepta las versiones vigentes.' },
        { id: 'moderation', label: 'Moderación', icon: 'gavel', description: 'Avisos y sanciones de tu cuenta, y tus alegaciones.' },
        { id: 'blocks', label: 'Perfiles bloqueados', icon: 'block', description: 'Personas que has bloqueado en Comunidad.' }
    ];

    activeSection: AccountSecuritySection = 'access';

    constructor(private route: ActivatedRoute, private host: ElementRef<HTMLElement>) { }

    ngOnInit(): void {
        const requested = this.route.snapshot.queryParamMap.get('section');
        if (this.sections.some(section => section.id === requested))
            this.activeSection = requested as AccountSecuritySection;
    }

    ngAfterViewInit(): void {
        revealActiveTab(this.host.nativeElement);
    }

    get activeInfo() {
        return this.sections.find(section => section.id === this.activeSection)!;
    }

    badge(section: AccountSecuritySection): string {
        const c = this.controller;
        if (section === 'policies') {
            const pending = c.policies.filter(policy => !policy.Aceptada).length;
            return pending ? String(pending) : '';
        }
        if (section === 'moderation') return c.moderationItemsCount ? String(c.moderationItemsCount) : '';
        return '';
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
