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
import { EmmittersService } from '../../../../services/bookEmmitter.service';
import { BookService } from '../../../../services/entities/book.service';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-chapter',
    standalone: true,
    imports: [MatInputModule, MatButtonModule, MatIconModule, CommonModule, MatCheckboxModule, ReactiveFormsModule, SnackbarModule, NgxLoadingModule],
    templateUrl: './chapter.component.html',
    styleUrl: './chapter.component.sass',
})
export class ChapterComponent implements OnInit, OnDestroy {
    viewportSize!: { width: number, height: number };
    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000'
    };

    charactersState: boolean = true;

    book: Book = {
        bookId: 0,
        name: '',
        authors: [],
        status: [],
        cover: '',
        userId: 0,
        chapters: [],
        characters: [],
        orderInSaga: 0,
        universeId: 0,
        sagaId: 0
    };
    chapter: Chapter = {
        chapterId: 0,
        name: '',
        orderInBook: 0,
        description: '',
        book_id: 0,
        characters: []
    };

    errorNameMessage = '';
    name = new FormControl(`Capítulo ${this.book.chapters.length + 1}`, [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
    ]);
    errorOrderMessage = '';
    order = new FormControl(`${this.book.chapters.length + 1}`, [
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

    constructor(private route: ActivatedRoute, private loginSrv: SessionService, private chapterSrv: ChapterService, private fBuild: FormBuilder, private bookSrv: BookService,
        private _snackBar: SnackbarModule, private emmiterSrv: EmmittersService) { }

    ngOnInit(): void {
        this.getViewportSize();
        this.route.params.subscribe((params) => {
            const bookId = params['id'];
            const chapterId = params['cpid'];
            this.waitingServerResponse = true;
            this.emmiterSrv.initializeBook(bookId);
            this.emmiterSrv.book$.pipe(takeUntil(this.destroy$)).subscribe((updatedBook: Book | null) => {
                if (updatedBook) {
                    this.book = updatedBook;
                    if (updatedBook.chapters && chapterId) {
                        this.chapter = updatedBook.chapters.filter(c => c.chapterId == chapterId)[0];
                        this.initializeForm();
                    }
                    if (updatedBook.characters) {
                        const chapterCharIds = this.chapter.characters?.map(c => c.characterId);
                        this.characters.clear();
                        updatedBook.characters.forEach((character) => {
                            const inChapter = chapterCharIds && chapterCharIds.includes(character.characterId);
                            const characterControl = this.fBuild.control(inChapter);
                            this.characters.push(characterControl);
                            if (inChapter === true)
                                this.selectedCharacterIds.push(character.characterId);
                        });
                    }
                    this.waitingServerResponse = false;
                }
            });
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    initializeForm(): void {
        this.name.setValue(this.chapter.name);
        this.order.setValue(this.chapter.orderInBook.toString());
        this.description.setValue(this.chapter.description);
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
        if (this.fgChapter.valid && this.selectedCharacterIds.length > 0) {
            const chapterTMP: ChapterT = {
                name: this.fgChapter.value.name ?? '',
                description: this.fgChapter.value.description ?? '',
                orderInBook: (Number)(this.fgChapter.value.order),
                bookId: this.book.bookId,
                charactersId: this.selectedCharacterIds,
            }
            if (this.chapter?.chapterId === 0) this.addCharacter(chapterTMP);
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
    }

    addCharacter(chapterTMP: ChapterT): void {
        this.chapterSrv.addChapter(chapterTMP, this.loginSrv.token).subscribe({
            next: (chapter) => {
                this.chapter = chapter;
                this.book.chapters.push(chapter);
                this.emmiterSrv.updateBook(this.book);
                this._snackBar.openSnackBar('Capítulo guardado', 'successBar');
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    updateChapter(chapterTMP: ChapterT): void {
        if (this.fgChapter.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgChapter.errors, 'errorBar');
            return;
        } else if (this.fgChapter.value.name === this.chapter.name && (Number)(this.fgChapter.value.order) === this.chapter.orderInBook && this.fgChapter.value.description === this.chapter.description && this.selectedCharacterIds.length === this.chapter.characters?.length) {
            const list1 = this.selectedCharacterIds.sort((a, b) => a - b);
            const list2 = this.chapter.characters.map(c => c.characterId).sort((a, b) => a - b);
            let equal = true;
            for (let i = 0; i < list1.length; i++) {
                if (list1[i] !== list2[i]) {
                    equal = false;
                    break;
                }
            }
            if (equal) {
                this._snackBar.openSnackBar('No ha camiado ningún valor', 'errorBar');
                return;
            }
        }
        const token = this.loginSrv.token;
        this.chapterSrv.updateChapter(chapterTMP, this.chapter.chapterId, token).subscribe({
            next: (chapter) => {
                this.chapter = chapter;
                const index = this.book.chapters.findIndex(chapter => chapter.chapterId === chapter.chapterId);
                if (index !== -1)
                    this.book.chapters.splice(index, 1, chapter);
                this.emmiterSrv.updateBook(this.book);
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
