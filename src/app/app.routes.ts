import { Routes } from '@angular/router';
import { HomeComponent } from './components/pages/home/home.component';
import { LoginComponent } from './components/pages/login/login.component';
import { RegisterComponent } from './components/pages/register/register.component';
import { DahsboardComponent } from './components/pages/dahsboard/dahsboard.component';
import { notAuthGuard } from './guards/notAuth.guard';
import { authGuard } from './guards/auth.guard';
import { BookComponent } from './components/shared/book-pages/book/book.component';
import { isAdminGuard } from './guards/is-admin.guard';
import { AdminpanelComponent } from './components/pages/adminpanel/adminpanel.component';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent, canActivate: [notAuthGuard] },
    { path: 'login', component: LoginComponent, canActivate: [notAuthGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [notAuthGuard] },
    { path: 'adminpanel', component: AdminpanelComponent, canActivate: [authGuard, isAdminGuard] },
    {
        path: 'book/:id', component: BookComponent, canActivate: [authGuard],
        loadChildren: () => import('./modules/book-router.module').then(m => m.routes)
    },
    {
        path: 'dashboard', component: DahsboardComponent, canActivate: [authGuard],
        loadChildren: () => import('./modules/user-router.module').then(m => m.routes)
    },
    { path: '**', component: HomeComponent, canActivate: [notAuthGuard] },
];