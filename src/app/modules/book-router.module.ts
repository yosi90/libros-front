import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { ChapterComponent } from '../components/pages/chapter/chapter.component';
import { CharacterComponent } from '../components/pages/character/character.component';


export const routes: Routes = [
    { path: '', redirectTo: '', pathMatch: 'full' },
    { path: 'chapter', component: ChapterComponent, canActivate: [authGuard] },
    { path: 'character', component: CharacterComponent, canActivate: [authGuard] },
    { path: '**', component: ChapterComponent, canActivate: [authGuard] },
]
