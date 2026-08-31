import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MobileAuthPageComponent } from '../../../../mobile/public/mobile-auth-page/mobile-auth-page.component';
import { LoginViewState } from '../login-view.contract';

@Component({
    selector: 'app-login-mobile-view',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, MatIconModule, MobileAuthPageComponent, A11yModule],
    templateUrl: './login-mobile-view.component.html',
    styleUrl: './login-mobile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginMobileViewComponent {
    private viewState!: LoginViewState;
    private linkRequiredPreviously = false;
    private methodTrigger: HTMLElement | null = null;
    private initialHistoryRead = false;

    @Input({ required: true })
    set state(value: LoginViewState) {
        this.viewState = value;
        if (!this.initialHistoryRead) {
            const historyMethod = history.state?.mobileLoginMethod;
            if (historyMethod === 'email' || historyMethod === 'phone')
                this.activeMethod = historyMethod;
            this.initialHistoryRead = true;
        }
        if (value.linkRequired && !this.linkRequiredPreviously)
            this.openMethod('email');
        this.linkRequiredPreviously = value.linkRequired;
    }
    get state(): LoginViewState { return this.viewState; }
    @Output() login = new EventEmitter<void>();
    @Output() googleLogin = new EventEmitter<void>();
    @Output() requestPhone = new EventEmitter<void>();
    @Output() confirmPhone = new EventEmitter<void>();
    @Output() emailBlur = new EventEmitter<void>();
    @Output() passwordBlur = new EventEmitter<void>();

    @ViewChild('methodBack') methodBack?: ElementRef<HTMLButtonElement>;

    passwordHidden = true;
    activeMethod: 'chooser' | 'email' | 'phone' = 'chooser';

    openMethod(method: 'email' | 'phone', event?: Event): void {
        this.methodTrigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
        if (this.activeMethod === 'chooser')
            history.pushState({ ...history.state, mobileLoginMethod: method }, '', location.href);
        this.activeMethod = method;
        queueMicrotask(() => this.methodBack?.nativeElement.focus());
    }

    closeMethod(): void {
        if (this.activeMethod === 'chooser') return;
        if (history.state?.mobileLoginMethod)
            history.back();
        else
            this.resetMethod();
    }

    @HostListener('window:popstate')
    resetMethod(): void {
        if (this.activeMethod === 'chooser') return;
        this.activeMethod = 'chooser';
        queueMicrotask(() => this.methodTrigger?.focus());
    }

    @HostListener('document:keydown.escape')
    closeMethodWithKeyboard(): void { this.closeMethod(); }
}
