import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AllBooksComponent } from '../../shared/administration/all-books/all-books.component';
import { AllUsersComponent } from '../../shared/administration/all-users/all-users.component';
import { CatalogModerationComponent } from '../../shared/administration/catalog-moderation/catalog-moderation.component';

type AdminSectionId = 'users' | 'catalogRequests' | 'reviewReports' | 'books';

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
        CatalogModerationComponent
    ],
    templateUrl: './adminpanel.component.html',
    styleUrl: './adminpanel.component.sass'
})
export class AdminpanelComponent {
    sections: AdminSection[] = [
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
            id: 'books',
            icon: 'menu_book',
            title: 'Gestión de libros',
            description: 'Listado administrativo de libros registrados.'
        }
    ];

    activeSection: AdminSectionId = 'catalogRequests';

    setActiveSection(sectionId: AdminSectionId): void {
        this.activeSection = sectionId;
    }
}
