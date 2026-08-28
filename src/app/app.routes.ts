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
    { path: 'login', loadComponent: () => import('./components/pages/login/login.component').then(m => m.LoginComponent), canActivate: [notAuthGuard] },
    { path: 'register', loadComponent: () => import('./components/pages/register/register.component').then(m => m.RegisterComponent), canActivate: [notAuthGuard] },
    { path: 'forgot-password', loadComponent: () => import('./components/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), canActivate: [notAuthGuard] },
    { path: 'reset-password', loadComponent: () => import('./components/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
    { path: 'verify-email', loadComponent: () => import('./components/pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
    { path: 'verify-email-pending', loadComponent: () => import('./components/pages/verify-email-pending/verify-email-pending.component').then(m => m.VerifyEmailPendingComponent) },
    { path: 'onboarding', loadComponent: () => import('./components/pages/onboarding/onboarding.component').then(m => m.OnboardingComponent), canActivate: [notAuthGuard] },
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
    { path: '**', redirectTo: 'dashboard/books' },
];
