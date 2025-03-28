import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ChapterService } from '../../../../services/entities/chapter.service';
import { ChapterT } from '../../../../interfaces/askers/chapter-t';
import { Book } from '../../../../interfaces/book';
import { Chapter } from '../../../../interfaces/chapter';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { SessionService } from '../../../../services/auth/session.service';
import { BookService } from '../../../../services/entities/book.service';
import { Subject, takeUntil } from 'rxjs';
import { BookEmmitterService } from '../../../../services/emmitters/bookEmmitter.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    standalone: true,
    selector:  'app-chapter',
    imports: [MatInputModule, MatButtonModule, MatIconModule, CommonModule, MatCheckboxModule, ReactiveFormsModule, SnackbarModule],
    templateUrl: './chapter.component.html',
    styleUrl: './chapter.component.sass'
})
export class ChapterComponent implements OnInit, OnDestroy {
    viewportSize: { width: number, height: number } = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    charactersState: boolean = true;

    book: Book = {
        Id: 0,
        Nombre: '',
        Autores: [],
        Estados: [],
        Portada: '',
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
    chapter: Chapter = {
        Id: 0,
        Nombre: '',
        Pagina: 0,
        Orden: 0,
        Descripcion: '',
        Escenas: []
    };

    errorNameMessage = '';
    name = new FormControl(`Capítulo ${this.book.Capitulos.length + 1}`, [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
    ]);
    errorOrderMessage = '';
    order = new FormControl(`${this.book.Capitulos.length + 1}`, [
        Validators.required,
        Validators.pattern('^[1-9]{1,2}'),
        Validators.min(0),
        Validators.max(99),
    ]);
    errorDescriptionMessage = '';
    description = new FormControl('', [
        Validators.required,
        Validators.minLength(15)
    ]);
    characters = this.fBuild.array([]);
    fgChapter = this.fBuild.group({
        name: this.name,
        order: this.order,
        description: this.description,
        characters: this.characters,
    });

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }
    
    private destroy$ = new Subject<void>();

    constructor(private route: ActivatedRoute, private chapterSrv: ChapterService, private fBuild: FormBuilder,
        private _snackBar: SnackbarModule, private bookEmmitterSrv: BookEmmitterService, private loader: LoaderEmmitterService) { }

    ngOnInit(): void {
        // this.loader.activateLoader();
        // this.getViewportSize();
        // this.route.params.subscribe((params) => {
        //     const bookId = params['id'];
        //     const chapterId = params['cpid'];
        //     this.bookEmmitterSrv.initializeBook(bookId);
        //     this.bookEmmitterSrv.book$.pipe(takeUntil(this.destroy$)).subscribe((updatedBook: Book | null) => {
        //         if (updatedBook) {
        //             this.book = updatedBook;
        //             if (updatedBook.Capitulos && chapterId) {
        //                 this.chapter = updatedBook.Capitulos.filter(c => c.Id == chapterId)[0];
        //                 this.initializeForm();
        //             }
        //             if (updatedBook.Personajes) {
        //                 const chapterCharIds = this.chapter.characters?.map(c => c.characterId);
        //                 this.characters.clear();
        //                 updatedBook.Personajes.forEach((character) => {
        //                     const inChapter = chapterCharIds && chapterCharIds.includes(character.Id);
        //                     const characterControl = this.fBuild.control(inChapter);
        //                     this.characters.push(characterControl);
        //                     if (inChapter === true)
        //                         this.selectedCharacterIds.push(character.Id);
        //                 });
        //             }
        //             this.loader.deactivateLoader();
        //         }
        //     });
        // });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    initializeForm(): void {
        this.name.setValue(this.chapter.Nombre);
        this.order.setValue(this.chapter.Orden.toString());
        this.description.setValue(this.chapter.Descripcion);
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateOrderErrorMessage() {
        if (this.order.hasError('required'))
            this.errorOrderMessage = 'El orden no puede quedar vacío';
        else if (this.order.hasError('min'))
            this.errorOrderMessage = 'El orden no puede ser menor que cero';
        else if (this.order.hasError('max'))
            this.errorOrderMessage = 'El orden máximo es 99';
        else this.errorOrderMessage = 'Orden no válido';
    }

    updateDescriptionErrorMessage() {
        if (this.description.hasError('required'))
            this.errorDescriptionMessage = 'La descripción no puede quedar vacía';
        else if (this.description.hasError('minlength'))
            this.errorDescriptionMessage = 'Descripción demasiado corta';
        else this.errorDescriptionMessage = 'Descripción no válida';
    }

    selectedCharacterIds: number[] = [];

    handleCharacterSelectionChange(event: any, characterId: number) {
        if (event.checked) {
            this.selectedCharacterIds.push(characterId);
        } else {
            const index = this.selectedCharacterIds.indexOf(characterId);
            if (index !== -1) {
                this.selectedCharacterIds.splice(index, 1);
            }
        }
    }

    setChapter(): void {
        this.loader.activateLoader();
        if (this.fgChapter.valid && this.selectedCharacterIds.length > 0) {
            const chapterTMP: ChapterT = {
                name: this.fgChapter.value.name ?? '',
                description: this.fgChapter.value.description ?? '',
                orderInBook: (Number)(this.fgChapter.value.order),
                bookId: this.book.Id,
                charactersId: this.selectedCharacterIds,
            }
            if (this.chapter?.Id === 0) this.addCharacter(chapterTMP);
            else this.updateChapter(chapterTMP);
        } else if (this.fgChapter.errors)
            this._snackBar.openSnackBar('Error: ' + this.fgChapter.errors, 'errorBar');
        else if (this.selectedCharacterIds.length === 0)
            this._snackBar.openSnackBar('Error: El capítulo debe tener al menos un personaje', 'errorBar');
        else {
            this.updateNameErrorMessage();
            this.updateOrderErrorMessage();
            this.updateDescriptionErrorMessage();
            this._snackBar.openSnackBar('Error: Rellena la información primero', 'errorBar');
        }
        this.loader.deactivateLoader();
    }

    addCharacter(chapterTMP: ChapterT): void {
        this.chapterSrv.addChapter(chapterTMP).subscribe({
            next: (chapter) => {
                this.chapter = chapter;
                this.book.Capitulos.push(chapter);
                this.bookEmmitterSrv.updateBook(this.book);
                this._snackBar.openSnackBar('Capítulo guardado', 'successBar');
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    updateChapter(chapterTMP: ChapterT): void {
        // if (this.fgChapter.invalid) {
        //     this._snackBar.openSnackBar('Error: ' + this.fgChapter.errors, 'errorBar');
        //     return;
        // } else if (this.fgChapter.value.name === this.chapter.Nombre && (Number)(this.fgChapter.value.order) === this.chapter.Orden && this.fgChapter.value.description === this.chapter.Descripcion && this.selectedCharacterIds.length === this.chapter.characters?.length) {
        //     const list1 = this.selectedCharacterIds.sort((a, b) => a - b);
        //     const list2 = this.chapter.characters.map(c => c.characterId).sort((a, b) => a - b);
        //     let equal = true;
        //     for (let i = 0; i < list1.length; i++) {
        //         if (list1[i] !== list2[i]) {
        //             equal = false;
        //             break;
        //         }
        //     }
        //     if (equal) {
        //         this._snackBar.openSnackBar('No ha camiado ningún valor', 'errorBar');
        //         return;
        //     }
        // }
        this.chapterSrv.updateChapter(chapterTMP, this.chapter.Id).subscribe({
            next: (chapter) => {
                this.chapter = chapter;
                const index = this.book.Capitulos.findIndex(chapter => chapter.Id === chapter.Id);
                if (index !== -1)
                    this.book.Capitulos.splice(index, 1, chapter);
                this.bookEmmitterSrv.updateBook(this.book);
                this._snackBar.openSnackBar('Capítulo actualizado', 'successBar');
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    toggleState(): void {
        this.charactersState = !this.charactersState;
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        if (this.viewportSize.width > 1050 && !this.charactersState)
            this.charactersState = true;
        else if (this.viewportSize.width <= 1050 && this.charactersState)
            this.charactersState = false;
    }
}
