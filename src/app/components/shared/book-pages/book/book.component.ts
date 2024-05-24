import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BookService } from '../../../../services/entities/book.service';
import Swal from 'sweetalert2';
import { MatTooltipModule } from '@angular/material/tooltip';
import { User } from '../../../../interfaces/user';

@Component({
    selector: 'app-book',
    standalone: true,
    imports: [MatCardModule, MatIconModule, MatButtonModule, BookRouterComponent, CommonModule, MatSidenavModule, NgxLoadingModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, FormsModule, MatTooltipModule
    ],
    templateUrl: './book.component.html',
    styleUrl: './book.component.sass'
})
export class BookComponent implements OnInit, OnDestroy {
    userData!: User;
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
        status: [],
        cover: '',
        userId: 0,
        authors: [],
        chapters: [],
        characters: [],
        orderInSaga: 0,
        universeId: 0,
        universe: {
            universeId: 0,
            name: '',
            authorIds: [],
            authors: [],
            userId: 0,
            sagaIds: [],
            sagas: [],
            bookIds: []
        },
        sagaId: 0,
        saga: {
            sagaId: 0,
            userId: 0,
            name: '',
            authorIds: [],
            authors: [],
            universeId: 0,
            universe: {
                universeId: 0,
                name: '',
                authorIds: [],
                authors: [],
                userId: 0,
                sagaIds: [],
                sagas: [],
                bookIds: []
            },
            bookIds: []
        }
    };
    actualStatus = 1;
    showChaps: boolean = true;

    private destroy$ = new Subject<void>();

    errorStatusMessage = '';

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private route: ActivatedRoute, private router: Router, public sessionSrv: SessionService, private emmiterSrv: EmmittersService, private bookSrv: BookService) { }

    ngOnInit(): void {
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const bookId = params['id'];
            this.waitingServerResponse = true;
            this.emmiterSrv.initializeBook(bookId);
            this.emmiterSrv.book$.pipe(takeUntil(this.destroy$)).subscribe((book: Book | null) => {
                if (book) {
                    if (this.sessionSrv.userId !== book.userId)
                        this.sessionSrv.logout();
                    this.book = book;
                    this.actualStatus = book.status[book.status.length - 1].status.statusId;
                    this.waitingServerResponse = false;
                }
            });
            this.sessionSrv.user.pipe(takeUntil(this.destroy$)).subscribe(user => {
                this.userData = user;
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

    updateBookStatus(statusId: number) {
        if (this.book.status[this.book.status.length - 1].status.statusId === statusId)
            return;
        this.bookSrv.updateStatus(this.book.bookId, statusId).subscribe({
            next: (book) => {
                this.book = book;
                this.emmiterSrv.updateBook(book);
                Swal.fire({
                    icon: 'success',
                    title: 'Estado del libro actualizado con éxito',
                    showConfirmButton: true,
                    timer: 2000
                });
                if (this.userData.books) {
                    const index = this.userData.books?.findIndex(b => b.bookId === book.bookId);
                    if (index !== -1)
                        this.userData.books[index] = book;
                    this.sessionSrv.updateUserData(this.userData);
                }
            },
            error: () => {
                this.waitingServerResponse = false;
                Swal.fire({
                    icon: 'warning',
                    title: 'Error al actualizar el estado',
                    showConfirmButton: true,
                    timer: 2000
                });
            },
            complete: () => {
                this.waitingServerResponse = false;
            }
        });
    }
}
