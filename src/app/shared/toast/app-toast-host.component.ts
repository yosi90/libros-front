import { AsyncPipe, NgClass } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppToast } from './app-toast';
import { AppToastService } from './app-toast.service';

@Component({
    standalone: true,
    selector: 'app-toast-host',
    imports: [AsyncPipe, NgClass, MatIconModule],
    templateUrl: './app-toast-host.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app-toast-host.component.sass'
})
export class AppToastHostComponent {
    readonly toasts$ = this.appToastSrv.toasts$;

    constructor(private appToastSrv: AppToastService) { }

    trackByToastId(_: number, toast: AppToast): string {
        return toast.id;
    }

    dismiss(id: string): void {
        this.appToastSrv.dismiss(id);
    }
}
