import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { ChapterComponent } from '../components/pages/chapter/chapter.component';
import { CharacterComponent } from '../components/pages/character/character.component';
import { AdminpanelComponent } from '../components/pages/adminpanel/adminpanel.component';
import { isAdminGuard } from '../guards/is-admin.guard';

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
