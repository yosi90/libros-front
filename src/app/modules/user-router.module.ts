import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { BooksComponent } from '../components/shared/user-pages/books/books.component';
import { UserProfileComponent } from '../components/shared/user-pages/user-profile/user-profile.component';
import { StatisticsComponent } from '../components/shared/user-pages/statistics/statistics.component';
import { ObjectManagerComponent } from '../components/shared/user-pages/object-manager/object-manager.component';
import { CatalogComponent } from '../components/shared/user-pages/catalog/catalog.component';
import { AdminpanelComponent } from '../components/pages/adminpanel/adminpanel.component';
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
                path: 'community',
                component: SocialShellComponent,
                canActivate: [authGuard],
                children: [
                    { path: 'summary', component: SocialSummaryComponent },
                    { path: 'people', component: CommunityComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', communityView: 'people' } },
                    { path: 'activity', component: CommunityComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', communityView: 'activity' } },
                    { path: 'friendships', component: CommunityRelationshipsComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', relationshipView: 'amistades' } },
                    { path: 'blocks', component: CommunityRelationshipsComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed', relationshipView: 'bloqueos', blocksOnly: true } },
                    { path: 'clubs/:id', component: ClubDetailComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'clubes' } },
                    { path: 'clubs', component: CommunityComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'clubes', communityView: 'clubs' } },
                    { path: 'users/:id', component: CommunityProfileComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'feed' } },
                    { path: 'messages', component: ChatComponent, canActivate: [communityCapabilityGuard], data: { communityCapability: 'chat' }, children: [
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
            },
            {
                path: 'adminpanel',
                component: AdminpanelComponent,
                canActivate: [authGuard, canModerateCatalogGuard, desktopAdministrationGuard],
            },
            {
                path: 'authors',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'authors' },
            },
            {
                path: 'authors/new',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'authors', mode: 'create' },
            },
            {
                path: 'authors/:id',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'authors' },
            },
            {
                path: 'universes',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'universes' },
            },
            {
                path: 'universes/new',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'universes', mode: 'create' },
            },
            {
                path: 'universes/:id',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'universes' },
            },
            {
                path: 'sagas',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'sagas' },
            },
            {
                path: 'sagas/new',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'sagas', mode: 'create' },
            },
            {
                path: 'sagas/:id',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'sagas' },
            },
            {
                path: 'anthologies',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'anthologies' },
            },
            {
                path: 'anthologies/new',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'anthologies', mode: 'create' },
            },
            {
                path: 'anthologies/:id',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'anthologies' },
            },
            {
                path: 'books/manage',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'books' },
            },
            {
                path: 'books/manage/new',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'books', mode: 'create' },
            },
            {
                path: 'books/manage/:id',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'books' },
            },
            { path: '', redirectTo: 'books', pathMatch: 'full' },
            { path: '**', redirectTo: 'books' },
        ],
    },
];
