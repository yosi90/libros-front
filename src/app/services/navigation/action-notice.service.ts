import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

export interface ActionNotice {
    id: string;
    title: string;
    message: string;
    actionLabel: string;
    commands: string[];
    queryParams?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ActionNoticeService {
    private readonly noticeSubject = new BehaviorSubject<ActionNotice | null>(null);
    readonly notice$ = this.noticeSubject.asObservable();

    constructor(private router: Router) { }

    show(notice: ActionNotice): void { this.noticeSubject.next(notice); }
    dismiss(id?: string): void {
        if (!id || this.noticeSubject.value?.id === id) this.noticeSubject.next(null);
    }
    open(notice: ActionNotice): void {
        this.dismiss(notice.id);
        void this.router.navigate(notice.commands, { queryParams: notice.queryParams });
    }
}
