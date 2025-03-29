import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
import { Book, DisplayGroup, DisplayItem } from '../../../../interfaces/book';
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
import { Chapter } from '../../../../interfaces/chapter';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';

@Component({
    standalone: true,
    selector: 'app-book',
    imports: [MatCardModule, MatIconModule, MatButtonModule, BookRouterComponent, CommonModule, MatSidenavModule, SnackbarModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, FormsModule, MatTooltipModule
    ],
    templateUrl: './book.component.html',
    styleUrl: './book.component.sass'
})
export class BookComponent implements OnInit, OnDestroy {
    imgUrl = environment.getImgUrl;
    viewportSize!: { width: number, height: number };

    maxOrder: number = 0;

    book: Book = {
        Id: 0,
        Nombre: '',
        Estados: [],
        Portada: '',
        Autores: [],
        Capitulos: [],
        Partes: [],
        Interludios: [],
        Personajes: [],
        Localizaciones: [],
        Conceptos: [],
        Organizaciones: [],
        Eventos: [],
        Citas: [],
        Orden: 0,
        Universo: {
            Id: 0,
            Nombre: '',
        },
        Saga: {
            Id: 0,
            Nombre: '',
        }
    };
    actualStatus = '';
    showChaps: boolean = true;

    displayList: DisplayItem[] = [];

    private destroy$ = new Subject<void>();

    errorStatusMessage = '';

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public sessionSrv: SessionService,
        private bookSrv: BookService,
        private bookStore: BookStoreService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule,
    ) {

    }

    ngOnInit(): void {
        this.getViewportSize();
        this.route.paramMap.subscribe(params => {
            const bookId = Number(params.get('id'));
            if (bookId) {
                this.book = this.bookStore.getLibro();
                if (this.book.Id >= 1 && bookId == this.book.Id) {
                    this.generateDisplayList();
                    return;
                }
                this.loader.activateLoader();
                this.bookSrv.getBook(bookId).subscribe({
                    next: (book) => {
                        this.book = book;
                        this.generateDisplayList();
                        this.bookStore.setBook(book);
                        this.loader.deactivateLoader();
                    },
                    error: () => {
                        this.snackBar.openSnackBar('Error al cargar los datos del libro', 'errorBar');
                        this.loader.deactivateLoader();
                    }
                });
            } else {
                this.snackBar.openSnackBar('ID del libro inválido', 'errorBar');
            }
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



    generateDisplayList(): void {
        let capitulos = [...this.book.Capitulos].map(ch => ({ ...ch, Orden: Number(ch.Orden) }));

        const partes = [...this.book.Partes].map(p => ({
            ...p,
            Orden_inicio: Number(p.Orden_inicio),
            Orden_final: Number(p.Orden_final),
        }));
        const interludios = this.book.Interludios.map(i => ({
            ...i,
            Orden_cap: i.Orden_cap !== null ? Number(i.Orden_cap) : null,
            Orden_part: i.Orden_part !== null ? Number(i.Orden_part) : null,
            Capitulos: i.Capitulos.map(ch => ({ ...ch, Orden: Number(ch.Orden) })),
        }));

        this.displayList = [];

        this.maxOrder = Math.max(...capitulos.map(c => c.Orden));

        for (let i = this.maxOrder; i >= -1; i--) {
            const idx = capitulos.findIndex(c => c.Orden === i);
            const capitulo = capitulos.splice(idx, 1)[0];
            const parte = partes.find(p =>
                (p.Orden_final === 0 && i >= p.Orden_inicio) ||
                (i >= p.Orden_inicio && i <= p.Orden_final)
            );

            if (parte) {
                let existingPart = this.displayList.find(p => p.type === 'part' && p.id === parte.Id) as DisplayGroup;

                // Interludio tras parte (fuera de la parte)
                if (parte.Orden_final === i) {
                    const interludioParte = interludios.find(i => i.Orden_part === parte.Id);
                    if (interludioParte) {
                        this.displayList.push({
                            type: 'interlude',
                            name: interludioParte.Nombre,
                            id: interludioParte.Id,
                            data: interludioParte.Capitulos.sort((a, b) => b.Orden - a.Orden).map(ch => ({ type: 'chapter', data: ch }))
                        });
                    }
                }

                if (!existingPart) {
                    existingPart = {
                        type: 'part',
                        name: parte.Nombre,
                        id: parte.Id,
                        data: []
                    };
                    this.displayList.push(existingPart);
                }

                if (capitulo) {

                    if (capitulo.Nombre == 'Capítulo 46') {
                        console.log('equis')
                    }
                    const interludioCap = interludios.find(i => i.Orden_cap === capitulo.Orden);
                    if (interludioCap) {
                        existingPart.data.push({
                            type: 'interlude',
                            name: interludioCap.Nombre,
                            id: interludioCap.Id,
                            data: interludioCap.Capitulos.sort((a, b) => b.Orden - a.Orden).map(ch => ({ type: 'chapter', data: ch }))
                        });
                    }

                    existingPart.data.push({ type: 'chapter', data: capitulo });
                }
            } else if (capitulo) {
                this.displayList.push({ type: 'chapter', data: capitulo });

                const interludioCap = interludios.find(i => i.Orden_cap === capitulo.Orden);
                if (interludioCap) {
                    this.displayList.push({
                        type: 'interlude',
                        name: interludioCap.Nombre,
                        id: interludioCap.Id,
                        data: interludioCap.Capitulos.sort((a, b) => b.Orden - a.Orden).map(ch => ({ type: 'chapter', data: ch }))
                    });
                }
            }
        }
        console.log(this.displayList)
    }

    getChapterNameFromDisplayItem(item: DisplayItem): string {
        if (item.type === 'chapter') {
            return this.getChapterName(item.data);
        }
        return '';
    }

    getChapterName(chapter: Chapter): string {
        return chapter.Nombre === `Capítulo ${chapter.Orden}` ? chapter.Nombre : (chapter.Orden === this.maxOrder && chapter.Nombre === 'Epílogo') || chapter.Orden < 1 ? chapter.Nombre : `${chapter.Orden} - ${chapter.Nombre}`;
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
