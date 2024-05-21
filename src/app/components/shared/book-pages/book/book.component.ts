import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from '../../../../services/entities/book.service';
import { SessionService } from '../../../../services/auth/session.service';
import { Book } from '../../../../interfaces/book';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BookRouterComponent } from '../../../book-router/book-router.component';
import { EmmittersService } from '../../../../services/bookEmmitter.service';
import { environment } from '../../../../../environment/environment';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-book',
    standalone: true,
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        BookRouterComponent,
        CommonModule,
        MatSidenavModule,
        NgxLoadingModule
    ],
    templateUrl: './book.component.html',
    styleUrl: './book.component.sass'
})
export class BookComponent implements OnInit, OnDestroy {
    imgUrl = environment.apiUrl;
    viewportSize!: { width: number, height: number };
    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000'
    };

    book: Book = {
        bookId: 0,
        name: '',
        status: {
            statusId: 0,
            name: ''
        },
        cover: '',
        userId: 0,
        authors: [],
        chapters: [],
        characters: [],
        orderInSaga: 0,
        universeId: 0,
        sagaId: 0
    };
    showChaps: boolean = true;

    private destroy$ = new Subject<void>();

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private route: ActivatedRoute, private router: Router, public sessionSrv: SessionService, private emmiterSrv: EmmittersService) { }

    ngOnInit(): void {
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const bookId = params['id'];
            this.waitingServerResponse = true;
            this.emmiterSrv.initializeBook(bookId);
            this.emmiterSrv.book$.pipe(takeUntil(this.destroy$)).subscribe((updatedBook: Book | null) => {
                if (updatedBook) {
                    if (this.sessionSrv.userId !== updatedBook.userId)
                        this.sessionSrv.logout();
                    this.book = updatedBook;
                    this.waitingServerResponse = false;
                }
            });
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    addChapter(): void {
        this.router.navigate(['chapter'], { relativeTo: this.route });
    }

    addCharacter(): void {
        this.router.navigate(['character'], { relativeTo: this.route });
    }

    alternateList() {
        this.showChaps = !this.showChaps;
    }

    openChapter(event: any): void {
        this.router.navigateByUrl(`/book/${this.book?.bookId}/chapter/${event.target.id}`);
    }

    openCharacter(event: any): void {
        this.router.navigateByUrl(`/book/${this.book?.bookId}/character/${event.target.id}`);
    }
}
