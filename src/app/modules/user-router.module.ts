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
import { UpdateUniverseComponent } from '../components/shared/user-pages/update-universe/update-universe.component';
import { UpdateSagaComponent } from '../components/shared/user-pages/update-saga/update-saga.component';
import { AddAntologyComponent } from '../components/shared/user-pages/add-antology/add-antology.component';
import { UpdateAntologyComponent } from '../components/shared/user-pages/update-antology/update-antology.component';

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
                path: 'addAntology',
                component: AddAntologyComponent,
                canActivate: [authGuard],
            },
            {
                path: 'updateAntology/:id',
                component: UpdateAntologyComponent,
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
                path: 'updateUniverse/:id',
                component: UpdateUniverseComponent,
                canActivate: [authGuard],
            },
            {
                path: 'addSaga',
                component: AddSagaComponent,
                canActivate: [authGuard],
            },
            {
                path: 'updateSaga/:id',
                component: UpdateSagaComponent,
                canActivate: [authGuard],
            },
            { path: '', redirectTo: 'books', pathMatch: 'full' },
            { path: '**', redirectTo: 'books' },
        ],
    },
];