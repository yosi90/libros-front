import { Component, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { AllBooksComponent } from '../../shared/administration/all-books/all-books.component';
import { AllUsersComponent } from '../../shared/administration/all-users/all-users.component';
import { CatalogModerationComponent } from '../../shared/administration/catalog-moderation/catalog-moderation.component';
import { ModerationAdminComponent } from '../../shared/administration/moderation-admin/moderation-admin.component';
import { PlatformSessionService } from '../../../services/auth/platform-session.service';
import { AdminSummaryComponent } from '../../shared/administration/admin-summary/admin-summary.component';
import { AdminAuditComponent } from '../../shared/administration/admin-audit/admin-audit.component';
import { ActivatedRoute } from '@angular/router';
import { AdminBackupComponent } from '../../shared/administration/admin-backup/admin-backup.component';
import { AdminCatalogEntitiesComponent } from '../../shared/administration/admin-catalog-entities/admin-catalog-entities.component';

type AdminSectionId = 'summary' | 'users' | 'catalogRequests' | 'reviewReports' | 'communityReports' | 'audit' | 'backup' | 'books' | 'anthologies' | 'authors' | 'universes' | 'sagas';

interface AdminSection {
    id: AdminSectionId;
    icon: string;
    title: string;
    description: string;
}

@Component({
    standalone: true,
    selector:  'app-adminpanel',
    imports: [
    MatIconModule,
    AllBooksComponent,
    AllUsersComponent,
    CatalogModerationComponent,
    ModerationAdminComponent,
    AdminSummaryComponent,
    AdminAuditComponent,
    AdminBackupComponent,
    AdminCatalogEntitiesComponent
],
    templateUrl: './adminpanel.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './adminpanel.component.sass'
})
export class AdminpanelComponent {
    private readonly allSections: AdminSection[] = [
        {
            id: 'summary',
            icon: 'dashboard',
            title: 'Resumen',
            description: 'Estado agregado de la administración.'
        },
        {
            id: 'users',
            icon: 'group',
            title: 'Gestión de usuarios',
            description: 'Usuarios, roles y datos vinculados.'
        },
        {
            id: 'catalogRequests',
            icon: 'fact_check',
            title: 'Peticiones de catálogo',
            description: 'Altas y correcciones propuestas por usuarios.'
        },
        {
            id: 'books',
            icon: 'menu_book',
            title: 'Gestión de libros',
            description: 'Alta y edición de libros del catálogo.'
        },
        {
            id: 'anthologies',
            icon: 'collections_bookmark',
            title: 'Gestión de antologías',
            description: 'Alta y edición de antologías del catálogo.'
        },
        {
            id: 'authors',
            icon: 'groups',
            title: 'Gestión de autores',
            description: 'Alta y edición de autores del catálogo.'
        },
        {
            id: 'universes',
            icon: 'public',
            title: 'Gestión de universos',
            description: 'Alta y edición de universos del catálogo.'
        },
        {
            id: 'sagas',
            icon: 'bookmark',
            title: 'Gestión de sagas',
            description: 'Alta y edición de sagas del catálogo.'
        },
        {
            id: 'reviewReports',
            icon: 'shield',
            title: 'Reportes de reseñas',
            description: 'Reseñas señaladas por la comunidad.'
        },
        {
            id: 'communityReports',
            icon: 'outlined_flag',
            title: 'Denuncias comunitarias',
            description: 'Clubes y su contenido señalados para revisión.'
        },
        {
            id: 'audit',
            icon: 'history',
            title: 'Auditoría',
            description: 'Trazabilidad segura de cambios administrativos.'
        },
        {
            id: 'backup',
            icon: 'storage',
            title: 'Backup de datos',
            description: 'Generación y descarga protegida de la copia SQL.'
        }
    ];

    activeSection: AdminSectionId;

    constructor(private session: PlatformSessionService, private route: ActivatedRoute) {
        this.activeSection = session.isAdmin ? 'summary' : 'catalogRequests';
        this.route.queryParamMap.subscribe(params => {
            const section = params.get('section');
            if (this.isSectionAvailable(section)) this.activeSection = section;
        });
    }

    get sections(): AdminSection[] {
        if (this.session.isAdmin)
            return this.allSections;
        return this.allSections.filter(section => ['catalogRequests', 'books', 'anthologies', 'authors', 'universes', 'sagas', 'reviewReports', 'communityReports'].includes(section.id));
    }

    setActiveSection(sectionId: AdminSectionId): void {
        this.activeSection = sectionId;
    }

    private isSectionAvailable(section: string | null): section is AdminSectionId {
        return section !== null && this.sections.some(item => item.id === section);
    }
}
