import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import { AddAuthorComponent } from '../components/shared/user-pages/add-author/add-author.component';
import { AddBookComponent } from '../components/shared/user-pages/add-book/add-book.component';
import { AddSagaComponent } from '../components/shared/user-pages/add-saga/add-saga.component';
import { AddUniverseComponent } from '../components/shared/user-pages/add-universe/add-universe.component';
import { BooksComponent } from '../components/shared/user-pages/books/books.component';
import { UserProfileComponent } from '../components/shared/user-pages/user-profile/user-profile.component';
import { UpdateBookComponent } from '../components/shared/user-pages/update-book/update-book.component';
import { UpdateAuthorComponent } from '../components/shared/user-pages/update-author/update-author.component';

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
                path: 'updateBook/:id',
                component: UpdateBookComponent,
                canActivate: [authGuard],
            },
            {
                path: 'addAuthor',
                component: AddAuthorComponent,
                canActivate: [authGuard],
            },
            {
                path: 'updateAuthor/:id',
                component: UpdateAuthorComponent,
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