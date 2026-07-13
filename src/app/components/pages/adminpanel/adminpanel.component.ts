import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AllBooksComponent } from '../../shared/administration/all-books/all-books.component';
import { AllUsersComponent } from '../../shared/administration/all-users/all-users.component';
import { CatalogModerationComponent } from '../../shared/administration/catalog-moderation/catalog-moderation.component';
import { ModerationAdminComponent } from '../../shared/administration/moderation-admin/moderation-admin.component';
import { OperationalMetricsComponent } from '../../shared/administration/operational-metrics/operational-metrics.component';
import { SessionService } from '../../../services/auth/session.service';
import { AdminSummaryComponent } from '../../shared/administration/admin-summary/admin-summary.component';
import { AdminAuditComponent } from '../../shared/administration/admin-audit/admin-audit.component';
import { CommunityPoliciesAdminComponent } from '../../shared/administration/community-policies-admin/community-policies-admin.component';
import { ActivatedRoute } from '@angular/router';

type AdminSectionId = 'summary' | 'users' | 'catalogRequests' | 'reviewReports' | 'communityReports' | 'moderation' | 'policies' | 'operations' | 'audit' | 'books';

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
        CommonModule,
        MatIconModule,
        AllBooksComponent,
        AllUsersComponent,
        CatalogModerationComponent,
        ModerationAdminComponent,
        OperationalMetricsComponent,
        AdminSummaryComponent,
        AdminAuditComponent,
        CommunityPoliciesAdminComponent
    ],
    templateUrl: './adminpanel.component.html',
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
            id: 'reviewReports',
            icon: 'shield',
            title: 'Reportes de reseñas',
            description: 'Reseñas señaladas por la comunidad.'
        },
        {
            id: 'communityReports',
            icon: 'outlined_flag',
            title: 'Denuncias comunitarias',
            description: 'Contenido social señalado para revisión.'
        },
        {
            id: 'moderation',
            icon: 'gavel',
            title: 'Moderación de cuentas',
            description: 'Casos, sanciones, denuncias y alegaciones.'
        },
        {
            id: 'policies',
            icon: 'policy',
            title: 'Normas de comunidad',
            description: 'Borradores y versiones publicadas.'
        },
        {
            id: 'operations',
            icon: 'monitoring',
            title: 'Operación de Comunidad',
            description: 'Entregas, gates y estado agregado.'
        },
        {
            id: 'audit',
            icon: 'history',
            title: 'Auditoría',
            description: 'Trazabilidad segura de cambios administrativos.'
        },
        {
            id: 'books',
            icon: 'menu_book',
            title: 'Gestión de libros',
            description: 'Listado administrativo de libros registrados.'
        }
    ];

    activeSection: AdminSectionId;
    moderationTab: 'reports' | 'appeals' = 'reports';

    constructor(private session: SessionService, private route: ActivatedRoute) {
        this.activeSection = session.isAdmin ? 'summary' : 'catalogRequests';
        this.route.queryParamMap.subscribe(params => {
            const section = params.get('section');
            if (this.isSectionAvailable(section)) this.activeSection = section;
            this.moderationTab = params.get('tab') === 'appeals' ? 'appeals' : 'reports';
        });
    }

    get sections(): AdminSection[] {
        if (this.session.isAdmin)
            return this.allSections;
        return this.allSections.filter(section => ['users', 'catalogRequests', 'reviewReports', 'communityReports', 'books'].includes(section.id));
    }

    setActiveSection(sectionId: AdminSectionId): void {
        this.activeSection = sectionId;
    }

    private isSectionAvailable(section: string | null): section is AdminSectionId {
        return section !== null && this.sections.some(item => item.id === section);
    }
}
