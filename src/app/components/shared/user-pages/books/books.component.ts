import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
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

@Component({
    standalone: true,
    selector:  'app-books',
    imports: [NgxDropzoneModule, CommonModule, MatTooltip, MatIcon, RouterLink, SnackbarModule, MatExpansionModule, MatButtonModule],
    templateUrl: './books.component.html',
    styleUrl: './books.component.sass'
})
export class BooksComponent implements OnInit {
    imgUrl = environment.getImgUrl;
    universes: Universe[] = [];

    viewportSize!: { width: number, height: number };

    @ViewChild(MatAccordion) accordion!: MatAccordion;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private universeStore: UniverseStoreService, private router: Router, private _snackBar: SnackbarModule, private route: ActivatedRoute, private loader: LoaderEmmitterService) {
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
                this._snackBar.openSnackBar('Autor añadido', 'successBar');
            const authorUpdated = params['authorUpdated'];
            if (authorUpdated && authorUpdated === 'true')
                this._snackBar.openSnackBar('Autor actualizado', 'successBar');
            const universeAdded = params['universeAdded'];
            if (universeAdded && universeAdded === 'true')
                this._snackBar.openSnackBar('Universo añadido', 'successBar');
            const universeUpdated = params['universeUpdated'];
            if (universeUpdated && universeUpdated === 'true')
                this._snackBar.openSnackBar('Universo actualizado', 'successBar');
            const sagaAdded = params['sagaAdded'];
            if (sagaAdded && sagaAdded === 'true')
                this._snackBar.openSnackBar('Saga añadida', 'successBar');
            const sagaUpdated = params['sagaUpdated'];
            if (sagaUpdated && sagaUpdated === 'true')
                this._snackBar.openSnackBar('Saga actualizada', 'successBar');
            const antologyAdded = params['antologyAdded'];
            if (antologyAdded && antologyAdded === 'true')
                this._snackBar.openSnackBar('Antología añadida', 'successBar');
            const antologyUpdated = params['antologyUpdated'];
            if (antologyUpdated && antologyUpdated === 'true')
                this._snackBar.openSnackBar('Antología actualizada', 'successBar');
            const bookAdded = params['bookAdded'];
            if (bookAdded && bookAdded === 'true')
                this._snackBar.openSnackBar('Libro añadido', 'successBar');
            const bookUpdated = params['bookUpdated'];
            if (bookUpdated && bookUpdated === 'true')
                this._snackBar.openSnackBar('Libro actualizado', 'successBar');
        });
    }

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    openAntology(antologyId: number): void {
        this.loader.activateLoader();
        this.router.navigate(['antology', antologyId]);
    } 

    openBook(bookId: number): void {
        this.loader.activateLoader();
        this.router.navigate(['book', bookId]);
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
