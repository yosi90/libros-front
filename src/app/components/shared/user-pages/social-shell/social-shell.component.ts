import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommunityCapabilityId } from '../../../../interfaces/community-capabilities';
import { CommunityCapabilitiesService } from '../../../../services/stores/community-capabilities.service';

interface SocialNavigationItem {
    label: string;
    description: string;
    icon: string;
    path: string;
    capability?: CommunityCapabilityId;
}

@Component({
    standalone: true,
    selector: 'app-social-shell',
    imports: [NgFor, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './social-shell.component.html',
    styleUrl: './social-shell.component.sass'
})
export class SocialShellComponent {
    readonly items: SocialNavigationItem[] = [
        { label: 'Resumen', description: 'Tu actividad social', icon: 'dashboard', path: 'summary' },
        { label: 'Comunidad', description: 'Descubrir lectores', icon: 'diversity_3', path: 'people', capability: 'feed' },
        { label: 'Actividad', description: 'Publicaciones y lecturas', icon: 'timeline', path: 'activity', capability: 'feed' },
        { label: 'Amistades', description: 'Relaciones y solicitudes', icon: 'group', path: 'friendships', capability: 'feed' },
        { label: 'Bloqueos', description: 'Perfiles bloqueados', icon: 'block', path: 'blocks', capability: 'feed' },
        { label: 'Clubes', description: 'Lecturas compartidas', icon: 'groups_3', path: 'clubs', capability: 'clubes' },
        { label: 'Mensajes', description: 'Directos, grupos y sistema', icon: 'forum', path: 'messages', capability: 'chat' }
    ];

    constructor(private capabilities: CommunityCapabilitiesService) { }

    isAvailable(item: SocialNavigationItem): boolean {
        return !item.capability || this.capabilities.isActive(item.capability);
    }
}
