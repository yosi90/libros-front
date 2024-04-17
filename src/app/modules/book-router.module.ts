import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { ChapterComponent } from '../components/pages/chapter/chapter.component';
import { CharacterComponent } from '../components/pages/character/character.component';
import { BookComponent } from '../components/pages/book/book.component';

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
        path: 'character',
        component: CharacterComponent,
        canActivate: [authGuard],
      },
      { path: '', redirectTo: 'chapter', pathMatch: 'full' },
      { path: '**', redirectTo: 'chapter' },
    ],
  },
];
