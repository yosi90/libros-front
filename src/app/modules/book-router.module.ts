import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { ChapterComponent } from '../components/shared/book-pages/chapter/chapter.component';
import { CharacterComponent } from '../components/shared/book-pages/character/character.component';
import { BookStatisticsComponent } from '../components/shared/book-pages/book-statistics/book-statistics.component';

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
                path: 'chapter',
                component: ChapterComponent,
                canActivate: [authGuard],
            },
            {
                path: 'chapter/:cpid',
                component: ChapterComponent,
                canActivate: [authGuard],
            },
            {
                path: 'character',
                component: CharacterComponent,
                canActivate: [authGuard],
            },
            {
                path: 'character/:crid',
                component: CharacterComponent,
                canActivate: [authGuard],
            },
            { path: '', redirectTo: 'statistics', pathMatch: 'full' },
            { path: '**', redirectTo: 'statistics' },
        ],
    },
];
