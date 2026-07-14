import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppToast } from './app-toast';
import { AppToastService } from './app-toast.service';

@Component({
    standalone: true,
    selector: 'app-toast-host',
    imports: [AsyncPipe, NgClass, NgFor, NgIf, MatIconModule],
    templateUrl: './app-toast-host.component.html',
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
