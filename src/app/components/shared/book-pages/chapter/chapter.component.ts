import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { merge, Subject } from 'rxjs';
import { BookEmmitterService } from '../../../../services/emmitters/bookEmmitter.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
    standalone: true,
    selector: 'app-chapter',
    imports: [MatInputModule, MatSelectModule, MatButtonModule, MatFormFieldModule, FormsModule, MatIconModule,
        CommonModule, MatCheckboxModule, ReactiveFormsModule, SnackbarModule],
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
    errorPageMessage = '';
    page = new FormControl(`${this.chapter.Pagina}`, [
        Validators.required,
        Validators.pattern('^[1-9]{1,4}'),
        Validators.min(1),
        Validators.max(9999),
    ]);
    characters = this.fBuild.array([]);
    scenes = this.fBuild.array([]);

    fgChapter = this.fBuild.group({
        name: this.name,
        order: this.order,
        page: this.page,
        characters: this.characters,
        scenes: this.scenes
    });

    get scenesControls(): FormArray {
        return this.fgChapter.get('scenes') as FormArray;
    }

    get charactersControls(): FormArray {
        return this.fgChapter.get('characters') as FormArray;
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    private destroy$ = new Subject<void>();

    constructor(
        private bookStore: BookStoreService,
        private route: ActivatedRoute,
        private chapterSrv: ChapterService,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private bookEmmitterSrv: BookEmmitterService,
        private loader: LoaderEmmitterService
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.order.statusChanges, this.order.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateOrderErrorMessage());
        merge(this.page.statusChanges, this.page.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePageErrorMessage());
    }

    ngOnInit(): void {
        this.getViewportSize();
        this.route.params.subscribe((params) => {
            const chapterId = +params['cpid'];
            this.bookStore.book$.subscribe((book) => {
                if (book.Id === 0) return;
                this.book = book;
                if (chapterId) {
                    this.chapter = this.bookStore.getChapter(chapterId);
                } else {
                    this.chapter = {
                        Id: 0,
                        Nombre: `Capítulo ${book.Capitulos.length + 1}`,
                        Orden: book.Capitulos.length + 1,
                        Pagina: Number(book.Capitulos[book.Capitulos.length - 1].Pagina) + 1,
                        Escenas: []
                    }
                }
                this.initializeForm();
                this.scenesControls.valueChanges.subscribe(() => this.autoManageScenes());
            });
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    initializeForm(): void {
        this.fgChapter.patchValue({
            name: this.chapter.Nombre !== '' ? this.chapter.Nombre : `Capítulo ${this.chapter.Orden}`,
            order: this.chapter.Orden.toString(),
            page: this.chapter.Pagina.toString(),
        });
        (this.fgChapter.get('scenes') as FormArray).clear();
        if (this.chapter.Escenas && this.chapter.Escenas.length > 0) {
            this.chapter.Escenas.forEach(scene => {
                this.scenesControls.push(this.createSceneGroup(scene));
            });
        }
        if (this.scenesControls.length === 0)
            this.addScene();
        (this.fgChapter.get('characters') as FormArray).clear();
        if (this.book && this.book.Personajes.length > 0) {
            const idPersonajesCapitulo = this.chapter.Escenas.flatMap(e => e.Personajes);
            this.book.Personajes
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre))
                .forEach((character) => {
                    const inChapter = idPersonajesCapitulo && idPersonajesCapitulo.includes(character.Id);
                    const characterControl = this.fBuild.control(inChapter);
                    this.characters.push(characterControl);
                    if (inChapter)
                        this.selectedCharacterIds.push(character.Id);
                });
        }
    }

    createSceneGroup(data?: any): FormGroup {
        return this.fBuild.group({
            nombre: [data?.Nombre || '', [Validators.required, Validators.minLength(3)]],
            localizacion: [data?.Localizacion || (this.book.Localizaciones[0]?.Id || ''), Validators.required],
            descripcion: [data?.Descripcion || '', [Validators.required, Validators.minLength(15)]],
            personajes: this.fBuild.array([])
        });
    }

    addScene(): void {
        this.scenesControls.push(this.createSceneGroup());
    }

    removeScene(index: number): void {
        this.scenesControls.removeAt(index);
    }

    isSceneValid(sceneGroup: FormGroup): boolean {
        const value = sceneGroup.value;
        return value.nombre && value.nombre.trim().length > 3 && value.descripcion && value.descripcion.trim().length > 15 && value.localizacion;
    }

    isSceneEliminable(sceneGroup: FormGroup): boolean {
        const value = sceneGroup.value;
        return (!value.nombre || value.nombre.trim().length < 3) && (!value.descripcion || value.descripcion.trim().length < 15) && (!value.localizacion);
    }

    autoManageScenes(): void {
        if (this.scenesControls.length === 0) {
            this.addScene();
            return;
        }
        const eliminableIndices: number[] = [];
        this.scenesControls.controls.forEach((sceneGroup, index) => {
            if (this.isSceneEliminable(sceneGroup as FormGroup)) {
                eliminableIndices.push(index);
            }
        });
        if (eliminableIndices.length >= 2) {
            eliminableIndices.sort((a, b) => b - a);
            this.removeScene(eliminableIndices[0]);
        } else if (eliminableIndices.length === 0)
            this.addScene();
    }

    trackByIndex(index: number, item: any): number {
        return index;
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

    updatePageErrorMessage() {
        if (this.page.hasError('required'))
            this.errorPageMessage = 'El número de página no puede quedar vacío';
        else if (this.page.hasError('min'))
            this.errorPageMessage = 'La página no puede ser menor que uno';
        else if (this.page.hasError('max'))
            this.errorPageMessage = 'La página máxima es 9999';
        else this.errorPageMessage = 'Página no válida';
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
        // this.loader.activateLoader();
        // if (this.fgChapter.valid && this.selectedCharacterIds.length > 0) {
        //     const chapterTMP: ChapterT = {
        //         name: this.fgChapter.value.name ?? '',
        //         description: this.fgChapter.value.description ?? '',
        //         orderInBook: (Number)(this.fgChapter.value.order),
        //         bookId: this.book.Id,
        //         charactersId: this.selectedCharacterIds,
        //     }
        //     if (this.chapter?.Id === 0) this.addCharacter(chapterTMP);
        //     else this.updateChapter(chapterTMP);
        // } else if (this.fgChapter.errors)
        //     this._snackBar.openSnackBar('Error: ' + this.fgChapter.errors, 'errorBar');
        // else if (this.selectedCharacterIds.length === 0)
        //     this._snackBar.openSnackBar('Error: El capítulo debe tener al menos un personaje', 'errorBar');
        // else {
        //     this.updateNameErrorMessage();
        //     this.updateOrderErrorMessage();
        //     this.updateDescriptionErrorMessage();
        //     this._snackBar.openSnackBar('Error: Rellena la información primero', 'errorBar');
        // }
        // this.loader.deactivateLoader();
    }

    addCharacter(chapterTMP: ChapterT): void {
        // this.chapterSrv.addChapter(chapterTMP).subscribe({
        //     next: (chapter) => {
        //         this.chapter = chapter;
        //         this.book.Capitulos.push(chapter);
        //         this.bookEmmitterSrv.updateBook(this.book);
        //         this._snackBar.openSnackBar('Capítulo guardado', 'successBar');
        //     },
        //     error: (errorData) => {
        //         this._snackBar.openSnackBar(errorData, 'errorBar');
        //     },
        // });
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

        // this.chapterSrv.updateChapter(chapterTMP, this.chapter.Id).subscribe({
        //     next: (chapter) => {
        //         this.chapter = chapter;
        //         const index = this.book.Capitulos.findIndex(chapter => chapter.Id === chapter.Id);
        //         if (index !== -1)
        //             this.book.Capitulos.splice(index, 1, chapter);
        //         this.bookEmmitterSrv.updateBook(this.book);
        //         this._snackBar.openSnackBar('Capítulo actualizado', 'successBar');
        //     },
        //     error: (errorData) => {
        //         this._snackBar.openSnackBar(errorData, 'errorBar');
        //     },
        // });
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
