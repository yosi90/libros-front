import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { BooksComponent } from '../components/shared/user-pages/books/books.component';
import { UserProfileComponent } from '../components/shared/user-pages/user-profile/user-profile.component';
import { StatisticsComponent } from '../components/shared/user-pages/statistics/statistics.component';
import { CatalogComponent } from '../components/shared/user-pages/catalog/catalog.component';
import { profileSectionGuard } from '../guards/profile-section.guard';
import { CommunityComponent } from '../components/shared/user-pages/community/community.component';
import { ClubDetailComponent } from '../components/shared/user-pages/club-detail/club-detail.component';
import { ChatComponent } from '../components/shared/user-pages/chat/chat.component';
import { ChatConversationComponent } from '../components/shared/user-pages/chat-conversation/chat-conversation.component';
import { communityCapabilityGuard } from '../guards/community-capability.guard';
import { SocialShellComponent } from '../components/shared/user-pages/social-shell/social-shell.component';
import { SocialSummaryComponent } from '../components/shared/user-pages/social-summary/social-summary.component';
import { AccountSecurityComponent } from '../components/shared/user-pages/account-security/account-security.component';
import { AppPreferencesComponent } from '../components/shared/user-pages/app-preferences/app-preferences.component';
import { desktopPresentationGuard } from '../guards/desktop-presentation.guard';

export const routes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'books',
                component: BooksComponent,
                canActivate: [authGuard],
            },
            {
                path: 'catalog',
                component: CatalogComponent,
                canActivate: [authGuard],
            },
            {
                path: 'profile',
                component: UserProfileComponent,
                canActivate: [authGuard],
            },
            {
                path: 'account-security',
                component: AccountSecurityComponent,
                canActivate: [authGuard, profileSectionGuard('security')],
            },
            {
                path: 'preferences',
                component: AppPreferencesComponent,
                canActivate: [authGuard, profileSectionGuard('preferences')],
            },
            {
                path: 'community',
                component: SocialShellComponent,
                canActivate: [authGuard],
                children: [
                    { path: 'summary', component: SocialSummaryComponent },
                    { path: 'clubs/:id', component: ClubDetailComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'clubes' } },
                    { path: 'clubs', component: CommunityComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'clubes' } },
                    // El chat es el de la plataforma (decisión 6 del roadmap del ecosistema), con cualquier sesión.
                    { path: 'messages', component: ChatComponent, children: [
                        { path: ':id', component: ChatConversationComponent }
                    ] },
                    // Las personas, las amistades, los bloqueos, los perfiles y el muro general se retiraron con la
                    // adhesión: son de la web social, que el resumen enlaza con el símbolo del ecosistema.
                    ...['people', 'activity', 'friendships', 'blocks', 'relationships', 'users/:id']
                        .map(path => ({ path, redirectTo: 'summary', pathMatch: 'full' as const })),
                    { path: '', redirectTo: 'summary', pathMatch: 'full' },
                ]
            },
            {
                path: 'statistics',
                component: StatisticsComponent,
                canActivate: [authGuard],
            },
            {
                path: 'authors',
                // Los listados personales viven en el Perfil.
                redirectTo: '/dashboard/profile?section=authors',
                pathMatch: 'full',
            },
            {
                path: 'authors/new',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=authors',
                pathMatch: 'full',
            },
            {
                path: 'authors/:id',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=authors',
                pathMatch: 'full',
            },
            {
                path: 'universes',
                // Los listados personales viven en el Perfil.
                redirectTo: '/dashboard/profile?section=universes',
                pathMatch: 'full',
            },
            {
                path: 'universes/new',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=universes',
                pathMatch: 'full',
            },
            {
                path: 'universes/:id',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=universes',
                pathMatch: 'full',
            },
            {
                path: 'sagas',
                // Los listados personales viven en el Perfil.
                redirectTo: '/dashboard/profile?section=sagas',
                pathMatch: 'full',
            },
            {
                path: 'sagas/new',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=sagas',
                pathMatch: 'full',
            },
            {
                path: 'sagas/:id',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=sagas',
                pathMatch: 'full',
            },
            {
                path: 'anthologies',
                // Los listados personales viven en el Perfil.
                redirectTo: '/dashboard/profile?section=anthologies',
                pathMatch: 'full',
            },
            {
                path: 'anthologies/new',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=anthologies',
                pathMatch: 'full',
            },
            {
                path: 'anthologies/:id',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=anthologies',
                pathMatch: 'full',
            },
            {
                path: 'books/manage',
                // Los listados personales viven en el Perfil.
                redirectTo: '/dashboard/profile?section=books',
                pathMatch: 'full',
            },
            {
                path: 'books/manage/new',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=books',
                pathMatch: 'full',
            },
            {
                path: 'books/manage/:id',
                // El catálogo se edita en el plugin de la administración de la plataforma; aquí, el listado del Perfil.
                redirectTo: '/dashboard/profile?section=books',
                pathMatch: 'full',
            },
            { path: '', redirectTo: 'books', pathMatch: 'full' },
            { path: '**', redirectTo: 'books' },
        ],
    },
];
