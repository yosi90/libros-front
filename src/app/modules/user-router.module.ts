import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { BooksComponent } from '../components/shared/user-pages/books/books.component';
import { UserProfileComponent } from '../components/shared/user-pages/user-profile/user-profile.component';
import { StatisticsComponent } from '../components/shared/user-pages/statistics/statistics.component';
import { ObjectManagerComponent } from '../components/shared/user-pages/object-manager/object-manager.component';
import { CatalogComponent } from '../components/shared/user-pages/catalog/catalog.component';
import { AdminpanelComponent } from '../components/pages/adminpanel/adminpanel.component';
import { isAdminGuard } from '../guards/is-admin.guard';
import { CommunityComponent } from '../components/shared/user-pages/community/community.component';
import { ClubDetailComponent } from '../components/shared/user-pages/club-detail/club-detail.component';
import { ChatComponent } from '../components/shared/user-pages/chat/chat.component';
import { ChatConversationComponent } from '../components/shared/user-pages/chat-conversation/chat-conversation.component';
import { CommunityProfileComponent } from '../components/shared/user-pages/community-profile/community-profile.component';
import { CommunityRelationshipsComponent } from '../components/shared/user-pages/community-relationships/community-relationships.component';
import { communityCapabilityGuard } from '../guards/community-capability.guard';

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
                path: 'community/clubs/:id',
                component: ClubDetailComponent,
                canActivate: [authGuard, communityCapabilityGuard],
                data: { communityCapability: 'clubes' },
            },
            {
                path: 'community/users/:id',
                component: CommunityProfileComponent,
                canActivate: [authGuard, communityCapabilityGuard],
                data: { communityCapability: 'feed' },
            },
            {
                path: 'community/relationships',
                component: CommunityRelationshipsComponent,
                canActivate: [authGuard, communityCapabilityGuard],
                data: { communityCapability: 'feed' },
            },
            {
                path: 'community',
                component: CommunityComponent,
                canActivate: [authGuard, communityCapabilityGuard],
                data: { communityCapability: 'feed' },
            },
            {
                path: 'chat/:id',
                component: ChatConversationComponent,
                canActivate: [authGuard, communityCapabilityGuard],
                data: { communityCapability: 'chat' },
            },
            {
                path: 'chat',
                component: ChatComponent,
                canActivate: [authGuard, communityCapabilityGuard],
                data: { communityCapability: 'chat' },
            },
            {
                path: 'statistics',
                component: StatisticsComponent,
                canActivate: [authGuard],
            },
            {
                path: 'adminpanel',
                component: AdminpanelComponent,
                canActivate: [authGuard, isAdminGuard],
            },
            {
                path: 'authors',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'authors' },
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
                path: 'books/manage/:id',
                component: ObjectManagerComponent,
                canActivate: [authGuard],
                data: { kind: 'books' },
            },
            {
                path: 'addBook',
                redirectTo: 'books/manage',
                pathMatch: 'full',
            },
            {
                path: 'updateBook/:id',
                redirectTo: 'books/manage/:id',
            },
            {
                path: 'addAntology',
                redirectTo: 'anthologies',
                pathMatch: 'full',
            },
            {
                path: 'updateAntology/:id',
                redirectTo: 'anthologies/:id',
            },
            {
                path: 'addAuthor',
                redirectTo: 'authors',
                pathMatch: 'full',
            },
            {
                path: 'updateAuthor/:id',
                redirectTo: 'authors/:id',
            },
            {
                path: 'addUniverse',
                redirectTo: 'universes',
                pathMatch: 'full',
            },
            {
                path: 'updateUniverse/:id',
                redirectTo: 'universes/:id',
            },
            {
                path: 'addSaga',
                redirectTo: 'sagas',
                pathMatch: 'full',
            },
            {
                path: 'updateSaga/:id',
                redirectTo: 'sagas/:id',
            },
            { path: '', redirectTo: 'books', pathMatch: 'full' },
            { path: '**', redirectTo: 'books' },
        ],
    },
];
