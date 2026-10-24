import { Routes } from '@angular/router';
import { HomeComponent } from './components/pages/home/home.component';
import { DahsboardComponent } from './components/pages/dahsboard/dahsboard.component';
import { notAuthGuard } from './guards/notAuth.guard';
import { authGuard } from './guards/auth.guard';
import { BookComponent } from './components/shared/book-pages/book/book.component';
import { bookLoadGuard } from './guards/book-load.guard';
import { mobileDesignPreviewGuard } from './guards/mobile-design-preview.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent, canActivate: [notAuthGuard] },
    // Entrar, registrarse y recuperar la cuenta son de la plataforma Yosiftware (`<yosi-acceso>` en la portada).
    // Los enlaces antiguos a esas páginas, también los de correos ya enviados, llevan a la portada.
    ...['login', 'register', 'forgot-password', 'reset-password', 'verify-email', 'verify-email-pending', 'onboarding']
        .map(path => ({ path, redirectTo: 'home', pathMatch: 'full' as const })),
    { path: 'adminpanel', redirectTo: 'dashboard/adminpanel', pathMatch: 'full' },
    {
        path: 'book/:id', component: BookComponent, canActivate: [authGuard, bookLoadGuard],
        loadChildren: () => import('./modules/book-router.module').then(m => m.routes)
    },
    {
        path: 'dashboard', component: DahsboardComponent, canActivate: [authGuard],
        loadChildren: () => import('./modules/user-router.module').then(m => m.routes)
    },
    {
        path: '__mobile-design/:screen',
        canActivate: [mobileDesignPreviewGuard],
        loadComponent: () => import('./components/pages/mobile-design-preview/mobile-design-preview.component').then(m => m.MobileDesignPreviewComponent)
    },
    {
        path: '__web-design/:screen',
        canActivate: [mobileDesignPreviewGuard],
        loadComponent: () => import('./components/pages/web-design-preview/web-design-preview.component').then(m => m.WebDesignPreviewComponent)
    },
    { path: '**', redirectTo: 'dashboard/books' },
];
