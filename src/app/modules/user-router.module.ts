import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { BooksComponent } from '../components/shared/user/books/books.component';
import { UserProfileComponent } from '../components/shared/user/user-profile/user-profile.component';
import { AddBookComponent } from '../components/shared/user/add-book/add-book.component';
import { AddAuthorComponent } from '../components/shared/user/add-author/add-author.component';
import { AddUniverseComponent } from '../components/shared/user/add-universe/add-universe.component';
import { AddSagaComponent } from '../components/shared/user/add-saga/add-saga.component';

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
                path: 'profile',
                component: UserProfileComponent,
                canActivate: [authGuard],
            },
            {
                path: 'addBook',
                component: AddBookComponent,
                canActivate: [authGuard],
            },
            {
                path: 'addAuthor',
                component: AddAuthorComponent,
                canActivate: [authGuard],
            },
            {
                path: 'addUniverse',
                component: AddUniverseComponent,
                canActivate: [authGuard],
            },
            {
                path: 'addSaga',
                component: AddSagaComponent,
                canActivate: [authGuard],
            },
            { path: '', redirectTo: 'books', pathMatch: 'full' },
            { path: '**', redirectTo: 'books' },
        ],
    },
];