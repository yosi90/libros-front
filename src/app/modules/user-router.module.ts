import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { BooksComponent } from '../components/shared/user-pages/books/books.component';
import { UserProfileComponent } from '../components/shared/user-pages/user-profile/user-profile.component';
import { StatisticsComponent } from '../components/shared/user-pages/statistics/statistics.component';
import { CatalogComponent } from '../components/shared/user-pages/catalog/catalog.component';
import { AdminpanelComponent } from '../components/pages/adminpanel/adminpanel.component';
import { profileSectionGuard } from '../guards/profile-section.guard';
import { canModerateCatalogGuard } from '../guards/can-moderate-catalog.guard';
import { CommunityComponent } from '../components/shared/user-pages/community/community.component';
import { ClubDetailComponent } from '../components/shared/user-pages/club-detail/club-detail.component';
import { ChatComponent } from '../components/shared/user-pages/chat/chat.component';
import { ChatConversationComponent } from '../components/shared/user-pages/chat-conversation/chat-conversation.component';
import { CommunityProfileComponent } from '../components/shared/user-pages/community-profile/community-profile.component';
import { CommunityRelationshipsComponent } from '../components/shared/user-pages/community-relationships/community-relationships.component';
import { communityCapabilityGuard } from '../guards/community-capability.guard';
import { SocialShellComponent } from '../components/shared/user-pages/social-shell/social-shell.component';
import { SocialSummaryComponent } from '../components/shared/user-pages/social-summary/social-summary.component';
import { desktopAdministrationGuard } from '../guards/desktop-administration.guard';
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
                data: { webView: true },
            },
            {
                path: 'catalog',
                component: CatalogComponent,
                canActivate: [authGuard],
                data: { webView: true },
            },
            {
                path: 'profile',
                component: UserProfileComponent,
                canActivate: [authGuard],
                data: { webView: true },
            },
            {
                path: 'account-security',
                component: AccountSecurityComponent,
                canActivate: [authGuard, profileSectionGuard('security')],
                data: { webView: true },
            },
            {
                path: 'preferences',
                component: AppPreferencesComponent,
                canActivate: [authGuard, profileSectionGuard('preferences')],
                data: { webView: true },
            },
            {
                path: 'community',
                component: SocialShellComponent,
                canActivate: [authGuard],
                children: [
                    { path: 'summary', component: SocialSummaryComponent, data: { webView: true } },
                    { path: 'people', component: CommunityComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', communityView: 'people', webView: true } },
                    { path: 'activity', component: CommunityComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', communityView: 'activity', webView: true } },
                    { path: 'friendships', component: CommunityRelationshipsComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', relationshipView: 'amistades', webView: true } },
                    { path: 'blocks', component: CommunityRelationshipsComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', relationshipView: 'bloqueos', blocksOnly: true, webView: true } },
                    { path: 'clubs/:id', component: ClubDetailComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'clubes', webView: true } },
                    { path: 'clubs', component: CommunityComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'clubes', communityView: 'clubs', webView: true } },
                    { path: 'users/:id', component: CommunityProfileComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', webView: true } },
                    { path: 'messages', component: ChatComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'chat', webView: true }, children: [
                        { path: ':id', component: ChatConversationComponent }
                    ] },
                    { path: 'relationships', redirectTo: 'friendships', pathMatch: 'full' },
                    { path: '', redirectTo: 'summary', pathMatch: 'full' },
                ]
            },
            {
                path: 'statistics',
                component: StatisticsComponent,
                canActivate: [authGuard],
                data: { webView: true },
            },
            {
                path: 'adminpanel',
                component: AdminpanelComponent,
                canActivate: [authGuard, canModerateCatalogGuard, desktopAdministrationGuard],
            },
            {
                path: 'authors',
                // Los listados personales viven en el Perfil.
                redirectTo: '/dashboard/profile?section=authors',
                pathMatch: 'full',
            },
            {
                path: 'authors/new',
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=authors',
                pathMatch: 'full',
            },
            {
                path: 'authors/:id',
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=authors',
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
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=universes',
                pathMatch: 'full',
            },
            {
                path: 'universes/:id',
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=universes',
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
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=sagas',
                pathMatch: 'full',
            },
            {
                path: 'sagas/:id',
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=sagas',
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
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=anthologies',
                pathMatch: 'full',
            },
            {
                path: 'anthologies/:id',
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=anthologies',
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
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=books',
                pathMatch: 'full',
            },
            {
                path: 'books/manage/:id',
                // Altas y ediciones canónicas viven en Administración.
                redirectTo: '/dashboard/adminpanel?section=books',
                pathMatch: 'full',
            },
            { path: '', redirectTo: 'books', pathMatch: 'full' },
            { path: '**', redirectTo: 'books' },
        ],
    },
];
