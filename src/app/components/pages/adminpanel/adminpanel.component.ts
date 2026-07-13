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

type AdminSectionId = 'summary' | 'users' | 'catalogRequests' | 'reviewReports' | 'moderation' | 'operations' | 'books';

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
        AdminSummaryComponent
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
            id: 'moderation',
            icon: 'gavel',
            title: 'Moderación de cuentas',
            description: 'Casos, sanciones, políticas y alegaciones.'
        },
        {
            id: 'operations',
            icon: 'monitoring',
            title: 'Operación de Comunidad',
            description: 'Entregas, gates y estado agregado.'
        },
        {
            id: 'books',
            icon: 'menu_book',
            title: 'Gestión de libros',
            description: 'Listado administrativo de libros registrados.'
        }
    ];

    activeSection: AdminSectionId;

    constructor(private session: SessionService) {
        this.activeSection = session.isAdmin ? 'summary' : 'catalogRequests';
    }

    get sections(): AdminSection[] {
        if (this.session.isAdmin)
            return this.allSections;
        return this.allSections.filter(section => ['users', 'catalogRequests', 'reviewReports', 'books'].includes(section.id));
    }

    setActiveSection(sectionId: AdminSectionId): void {
        this.activeSection = sectionId;
    }
}
