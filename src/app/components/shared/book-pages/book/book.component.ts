import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
import { Book } from '../../../../interfaces/book';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BookRouterComponent } from '../../../book-router/book-router.component';
import { environment } from '../../../../../environment/environment';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
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
import { BookEmmitterService } from '../../../../services/emmitters/bookEmmitter.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    standalone: true,
    selector:  'app-book',
    imports: [MatCardModule, MatIconModule, MatButtonModule, BookRouterComponent, CommonModule, MatSidenavModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, FormsModule, MatTooltipModule
    ],
    templateUrl: './book.component.html',
    styleUrl: './book.component.sass'
})
export class BookComponent implements OnInit, OnDestroy {
    userData!: User;
    imgUrl = environment.apiUrl;
    viewportSize!: { width: number, height: number };

    book: Book = {
        Id: 0,
        Nombre: '',
        Estados: [],
        Portada: '',
        Autores: [],
        chapters: [],
        characters: [],
        Orden: 0,
        universe: {
            Id: 0,
            Nombre: '',
            Autores: [],
            Sagas: [],
            Libros: [],
            Antologias: []
        },
        saga: {
            Id: 0,
            Nombre: '',
            Autores: [],
            Libros: [],
            Antologias: []
        }
    };
    actualStatus = '';
    showChaps: boolean = true;

    private destroy$ = new Subject<void>();

    errorStatusMessage = '';

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private route: ActivatedRoute, private router: Router, public sessionSrv: SessionService, private bookEmmitterSrv: BookEmmitterService, private bookSrv: BookService,
        private loader: LoaderEmmitterService) { }

    ngOnInit(): void {
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const bookId = params['id'];
            this.bookEmmitterSrv.initializeBook(bookId);
            this.bookEmmitterSrv.book$.pipe(takeUntil(this.destroy$)).subscribe((book: Book | null) => {
                if (book) {
                    this.book = book;
                    this.actualStatus = book.Estados[book.Estados.length - 1].Nombre;
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
        this.router.navigateByUrl(`/book/${this.book?.Id}/chapter/${event.target.id}`);
    }

    openCharacter(event: any): void {
        this.router.navigateByUrl(`/book/${this.book?.Id}/character/${event.target.id}`);
    }

    updateBookStatus(newStatus: string) {
        // if (this.book.Estados[this.book.Estados.length - 1].Nombre === newStatus)
        //     return;
        // this.loader.activateLoader();
        // this.bookSrv.updateStatus(this.book.Id, newStatus).subscribe({
        //     next: (book) => {
        //         this.book = book;
        //         this.bookEmmitterSrv.updateBook(book);
        //         Swal.fire({
        //             icon: 'success',
        //             title: 'Estado del libro actualizado con éxito',
        //             showConfirmButton: true,
        //             timer: 2000
        //         });
        //         if (this.userData.books) {
        //             const index = this.userData.books?.findIndex(b => b.bookId === book.bookId);
        //             if (index !== -1)
        //                 this.userData.books[index] = book;
        //             this.sessionSrv.updateUserData(this.userData);
        //         }
        //     },
        //     error: () => {
        //         this.loader.deactivateLoader();
        //         Swal.fire({
        //             icon: 'warning',
        //             title: 'Error al actualizar el estado',
        //             showConfirmButton: true,
        //             timer: 2000
        //         });
        //     },
        //     complete: () => {
        //         this.loader.deactivateLoader();
        //     }
        // });
    }
}
