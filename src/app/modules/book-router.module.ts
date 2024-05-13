import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { ChapterComponent } from '../components/shared/book-pages/chapter/chapter.component';
import { CharacterComponent } from '../components/shared/book-pages/character/character.component';

export const routes: Routes = [
    {
        path: '',
        children: [
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
            { path: '', redirectTo: 'chapter', pathMatch: 'full' },
            { path: '**', redirectTo: 'chapter' },
        ],
    },
];
