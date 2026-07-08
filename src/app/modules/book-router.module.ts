import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { ChapterComponent } from '../components/shared/book-pages/chapter/chapter.component';
import { CharacterComponent } from '../components/shared/book-pages/character/character.component';
import { BookStatisticsComponent } from '../components/shared/book-pages/book-statistics/book-statistics.component';
import { BookAdvancedSearchComponent } from '../components/shared/book-pages/book-advanced-search/book-advanced-search.component';
import { NarrativeEntityPlaceholderComponent } from '../components/shared/book-pages/narrative-entity-placeholder/narrative-entity-placeholder.component';
import { pendingChangesGuard } from '../guards/pending-changes.guard';

export const routes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'statistics',
                component: BookStatisticsComponent,
                canActivate: [authGuard],
            },
            {
                path: 'search',
                component: BookAdvancedSearchComponent,
                canActivate: [authGuard],
            },
            {
                path: 'chapter',
                component: ChapterComponent,
                canActivate: [authGuard],
                canDeactivate: [pendingChangesGuard],
            },
            {
                path: 'chapter/:cpid',
                component: ChapterComponent,
                canActivate: [authGuard],
                canDeactivate: [pendingChangesGuard],
            },
            {
                path: 'interlude_chapter/:cpid',
                component: ChapterComponent,
                canActivate: [authGuard],
                canDeactivate: [pendingChangesGuard],
            },
            {
                path: 'interlude/:iid/chapter',
                component: ChapterComponent,
                canActivate: [authGuard],
                canDeactivate: [pendingChangesGuard],
            },
            {
                path: 'character',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'character/:crid',
                component: CharacterComponent,
                canActivate: [authGuard],
            },
            {
                path: 'characters',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'organizations',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'organization',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'events',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'event',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'locations',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'location',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'concepts',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'concept',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'quotes',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            {
                path: 'quote',
                component: NarrativeEntityPlaceholderComponent,
                canActivate: [authGuard],
            },
            { path: '', redirectTo: 'statistics', pathMatch: 'full' },
            { path: '**', redirectTo: 'statistics' },
        ],
    },
];
