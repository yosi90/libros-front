import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { revealActiveTab } from '../../ui/reveal-active-tab';
import type { SocialShellComponent } from '../../../shared/user-pages/social-shell/social-shell.component';

/** Estructura Web de Comunidad: título, pestañas por sección y el contenido de la ruta hija. */
@Component({
    selector: 'app-web-social-shell-view',
    standalone: true,
    imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './web-social-shell-view.component.html',
    styleUrl: './web-social-shell-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebSocialShellViewComponent implements AfterViewInit {
    @Input({ required: true }) controller!: SocialShellComponent;
    get c(): SocialShellComponent { return this.controller; }

    constructor(private host: ElementRef<HTMLElement>, private router: Router, private destroyRef: DestroyRef) { }

    ngAfterViewInit(): void {
        this.reveal();
        this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.reveal());
    }

    private reveal(): void {
        requestAnimationFrame(() => revealActiveTab(this.host.nativeElement, '.web-social__tabs'));
    }
}
