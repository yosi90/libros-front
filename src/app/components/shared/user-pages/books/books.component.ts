import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { environment } from '../../../../../environment/environment';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { BookSimple } from '../../../../interfaces/book';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { Universe } from '../../../../interfaces/universe';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { Author } from '../../../../interfaces/author';
import { Saga } from '../../../../interfaces/saga';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { BookService } from '../../../../services/entities/book.service';

@Component({
    standalone: true,
    selector:  'app-books',
    imports: [NgxDropzoneModule, CommonModule, MatIcon, RouterLink, SnackbarModule, MatExpansionModule, MatButtonModule],
    templateUrl: './books.component.html',
    styleUrl: './books.component.sass'
})
export class BooksComponent implements OnInit {
    imgUrl = environment.getImgUrl;
    universes: Universe[] = [];
    private readonly bookLightingCache = new Map<string, Record<string, string>>();
    private readonly bookLightingPresets: Record<string, string>[] = [
        {
            '--book-glow-x': '18%',
            '--book-glow-y': '0%',
            '--book-glow-size': '34%',
            '--book-glow-color': 'rgba(255, 226, 160, .12)'
        },
        {
            '--book-glow-x': '82%',
            '--book-glow-y': '10%',
            '--book-glow-size': '38%',
            '--book-glow-color': 'rgba(255, 204, 126, .1)'
        },
        {
            '--book-glow-x': '50%',
            '--book-glow-y': '100%',
            '--book-glow-size': '46%',
            '--book-glow-color': 'rgba(202, 164, 94, .11)'
        },
        {
            '--book-glow-x': '4%',
            '--book-glow-y': '56%',
            '--book-glow-size': '40%',
            '--book-glow-color': 'rgba(245, 231, 205, .08)'
        },
        {
            '--book-glow-x': '92%',
            '--book-glow-y': '78%',
            '--book-glow-size': '44%',
            '--book-glow-color': 'rgba(226, 184, 112, .1)'
        },
        {
            '--book-glow-x': '36%',
            '--book-glow-y': '24%',
            '--book-glow-size': '32%',
            '--book-glow-color': 'rgba(255, 238, 190, .09)'
        }
    ];

    viewportSize!: { width: number, height: number };

    @ViewChild(MatAccordion) accordion!: MatAccordion;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(
        private universeStore: UniverseStoreService,
        private router: Router, 
        private snackBar: SnackbarModule, 
        private route: ActivatedRoute, 
        private loader: LoaderEmmitterService,
    ) {
        loader.activateLoader();
        this.universeStore.universes$.subscribe(unis => {
            this.universes = unis;
            this.loader.deactivateLoader();
        });
    }

    ngOnInit(): void {
        this.getViewportSize();
        this.route.queryParams.subscribe(params => {
            const authorAdded = params['authorAdded'];
            if (authorAdded && authorAdded === 'true')
                this.snackBar.openSnackBar('Autor añadido', 'successBar');
            const authorUpdated = params['authorUpdated'];
            if (authorUpdated && authorUpdated === 'true')
                this.snackBar.openSnackBar('Autor actualizado', 'successBar');
            const universeAdded = params['universeAdded'];
            if (universeAdded && universeAdded === 'true')
                this.snackBar.openSnackBar('Universo añadido', 'successBar');
            const universeUpdated = params['universeUpdated'];
            if (universeUpdated && universeUpdated === 'true')
                this.snackBar.openSnackBar('Universo actualizado', 'successBar');
            const sagaAdded = params['sagaAdded'];
            if (sagaAdded && sagaAdded === 'true')
                this.snackBar.openSnackBar('Saga añadida', 'successBar');
            const sagaUpdated = params['sagaUpdated'];
            if (sagaUpdated && sagaUpdated === 'true')
                this.snackBar.openSnackBar('Saga actualizada', 'successBar');
            const antologyAdded = params['antologyAdded'];
            if (antologyAdded && antologyAdded === 'true')
                this.snackBar.openSnackBar('Antología añadida', 'successBar');
            const antologyUpdated = params['antologyUpdated'];
            if (antologyUpdated && antologyUpdated === 'true')
                this.snackBar.openSnackBar('Antología actualizada', 'successBar');
            const bookAdded = params['bookAdded'];
            if (bookAdded && bookAdded === 'true')
                this.snackBar.openSnackBar('Libro añadido', 'successBar');
            const bookUpdated = params['bookUpdated'];
            if (bookUpdated && bookUpdated === 'true')
                this.snackBar.openSnackBar('Libro actualizado', 'successBar');
        });
    }

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    openAntology(antologyId: number): void {
        this.router.navigate(['/antology', antologyId]);
    } 

    editAntology(antologyId: number, event: MouseEvent): void {
        event.stopPropagation();
        this.router.navigate(['/dashboard/updateAntology', antologyId]);
    }

    openBook(bookId: number): void {
        this.loader.activateLoader('book');
        window.setTimeout(() => {
            this.router.navigate(['/book', bookId]).then(navigated => {
                if (!navigated)
                    this.loader.deactivateLoader();
            });
        });
    } 

    editBook(bookId: number, event: MouseEvent): void {
        event.stopPropagation();
        this.router.navigate(['/dashboard/updateBook', bookId]);
    }

    getCardLighting(id: number, type: 'book' | 'antology'): Record<string, string> {
        const cacheKey = `${type}-${id}`;
        const cached = this.bookLightingCache.get(cacheKey);
        if (cached)
            return cached;

        const preset = this.bookLightingPresets[Math.floor(Math.random() * this.bookLightingPresets.length)];
        const lighting = { ...preset };
        this.bookLightingCache.set(cacheKey, lighting);
        return lighting;
    }
    
    get universesToShow(): Universe[] {
        return this.universes.filter(u =>
            (u.Libros && u.Libros.length > 0) ||
            (u.Sagas && u.Sagas.some(s => s.Libros && s.Libros.length > 0))
        );
    }
    
    getAuthors(authors: Author[]): string[] {
        let names: string[] = [];
        authors.forEach(a => names.push(a.Nombre));
        return names;
    }

    getExpanded(libros: BookSimple[]): boolean {
        return libros?.some(
            libro => libro.Estados?.[libro.Estados.length - 1]?.Nombre === "En marcha"
        ) ?? false;
    }
    
    getTotalBooksFromUniverse(universe: Universe): number {
        const propios = universe.Libros || [];
        const deSagas = universe.Sagas?.flatMap(s => s.Libros || []) ?? [];
        const Apropios = universe.Antologias || [];
        const AdeSagas = universe.Sagas?.flatMap(s => s.Antologias || []) ?? [];
        return [...propios, ...deSagas, ...Apropios, ...AdeSagas].length;
    }
    
    getTotalBooksFromSaga(saga: Saga): number {
        const propios = saga.Libros || [];
        const Apropios = saga.Antologias || [];
        return [...propios, ...Apropios].length;
    }
    
    getAllBooksFromUniverse(universe: Universe): BookSimple[] {
        const propios = universe.Libros || [];
        const deSagas = universe.Sagas?.flatMap(s => s.Libros || []) ?? [];
        return [...propios, ...deSagas];
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
