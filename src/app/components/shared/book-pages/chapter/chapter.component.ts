import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Book } from '../../../../interfaces/book';
import { Chapter } from '../../../../interfaces/chapter';
import { Scene, SceneCharacterDetail } from '../../../../interfaces/scene';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { forkJoin, merge, Subject, switchMap } from 'rxjs';
import { BookEmmitterService } from '../../../../services/emmitters/bookEmmitter.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SceneService } from '../../../../services/entities/scene.service';
import { SceneWrite } from '../../../../interfaces/api-contract';
import { BookService } from '../../../../services/entities/book.service';

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
    scenes = this.fBuild.array([]);
    deletedSceneIds: number[] = [];
    isInterludeChapter = false;

    fgChapter = this.fBuild.group({
        name: this.name,
        order: this.order,
        page: this.page,
        scenes: this.scenes
    });

    get scenesControls(): FormArray {
        return this.fgChapter.get('scenes') as FormArray;
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    private destroy$ = new Subject<void>();

    constructor(
        private bookStore: BookStoreService,
        private route: ActivatedRoute,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private bookEmmitterSrv: BookEmmitterService,
        private loader: LoaderEmmitterService,
        private sceneSrv: SceneService,
        private bookSrv: BookService
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
            this.isInterludeChapter = this.route.snapshot.routeConfig?.path?.startsWith('interlude_chapter') ?? false;
            this.bookStore.book$.subscribe((book) => {
                if (book.Id === 0) return;
                this.book = book;
                if (chapterId) {
                    this.chapter = this.isInterludeChapter ? this.bookStore.getInterludeChapter(chapterId) : this.bookStore.getChapter(chapterId);
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
        this.deletedSceneIds = [];
        (this.fgChapter.get('scenes') as FormArray).clear();
        if (this.chapter.Escenas && this.chapter.Escenas.length > 0) {
            this.chapter.Escenas.forEach(scene => {
                this.scenesControls.push(this.createSceneGroup(scene));
            });
        }
        if (this.scenesControls.length === 0)
            this.addScene();
    }

    createSceneGroup(data?: Scene): FormGroup {
        const sceneCharacters = this.getSceneCharacterDetails(data);
        return this.fBuild.group({
            id: [data?.Id ?? 0],
            nombre: [data?.Nombre || '', [Validators.required, Validators.minLength(3)]],
            localizacion: [data?.Localizacion?.Id || (this.book.Localizaciones[0]?.Id || ''), Validators.required],
            descripcion: [data?.Descripcion || '', [Validators.required, Validators.minLength(15)]],
            personajes: this.fBuild.array(
                this.getSortedCharacters().map(character => this.createSceneCharacterGroup(
                    character.Id,
                    character.Nombre,
                    sceneCharacters.find(sceneCharacter => sceneCharacter.Id === character.Id)
                ))
            )
        });
    }

    createSceneCharacterGroup(characterId: number, characterName: string, sceneCharacter?: SceneCharacterDetail): FormGroup {
        return this.fBuild.group({
            Id: [characterId, Validators.required],
            Nombre: [characterName],
            Seleccionado: [!!sceneCharacter],
            Nombrado: [sceneCharacter?.Nombrado ?? false]
        });
    }

    addScene(): void {
        this.scenesControls.push(this.createSceneGroup());
    }

    removeScene(index: number): void {
        const sceneId = Number(this.scenesControls.at(index).get('id')?.value ?? 0);
        if (sceneId > 0)
            this.deletedSceneIds.push(sceneId);
        this.scenesControls.removeAt(index);
    }

    isSceneValid(sceneGroup: FormGroup): boolean {
        const value = sceneGroup.value;
        return value.nombre && value.nombre.trim().length > 3 && value.descripcion && value.descripcion.trim().length > 15 && value.localizacion && this.hasPresentCharacter(sceneGroup);
    }

    isSceneEliminable(sceneGroup: FormGroup): boolean {
        const value = sceneGroup.value;
        return Number(value.id ?? 0) === 0 && (!value.nombre || value.nombre.trim().length < 3) && (!value.descripcion || value.descripcion.trim().length < 15);
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

    getSceneCharacterIds(scene: Scene): number[] {
        return this.getSceneCharacterDetails(scene).map(character => character.Id);
    }

    getSceneCharacterDetails(scene?: Scene): SceneCharacterDetail[] {
        if (!scene) return [];
        if (scene.PersonajesDetalle?.length) return scene.PersonajesDetalle;
        return (scene.Personajes ?? []).map(character => typeof character === 'number'
            ? { Id: character, Nombrado: false }
            : { Id: character.Id, Nombrado: !!character.Nombrado });
    }

    hasPresentCharacter(sceneGroup: any): boolean {
        const characters = sceneGroup.get('personajes') as FormArray;
        return characters.controls.some(control => control.get('Seleccionado')?.value && !control.get('Nombrado')?.value);
    }

    getSortedCharacters() {
        return [...this.book.Personajes].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
    }

    getSceneCharacters(sceneGroup: any): FormArray {
        return sceneGroup.get('personajes') as FormArray;
    }

    getSelectedSceneCharacters(sceneGroup: FormGroup): SceneWrite['Personajes'] {
        const characters = sceneGroup.get('personajes') as FormArray;
        return characters.controls
            .filter(control => control.get('Seleccionado')?.value)
            .map(control => ({
                Id: Number(control.get('Id')?.value),
                Nombrado: !!control.get('Nombrado')?.value
            }));
    }

    clearMentionWhenUnselected(characterGroup: any): void {
        if (!characterGroup.get('Seleccionado')?.value)
            characterGroup.get('Nombrado')?.setValue(false);
    }

    buildScenePayload(sceneGroup: FormGroup): SceneWrite {
        const value = sceneGroup.getRawValue();
        return {
            Nombre: value.nombre,
            Descripcion: value.descripcion,
            Id_Localizacion: Number(value.localizacion),
            Personajes: this.getSelectedSceneCharacters(sceneGroup)
        };
    }

    setChapter(): void {
        if (this.chapter.Id <= 0) {
            this._snackBar.openSnackBar('Guarda el capítulo antes de editar escenas', 'errorBar');
            return;
        }

        const editableScenes = this.scenesControls.controls
            .map(control => control as FormGroup)
            .filter(sceneGroup => !this.isSceneEliminable(sceneGroup));

        if (editableScenes.length === 0) {
            this._snackBar.openSnackBar('Añade al menos una escena válida', 'errorBar');
            return;
        }

        const invalidSceneIndex = editableScenes.findIndex(sceneGroup => sceneGroup.invalid || !this.hasPresentCharacter(sceneGroup));
        if (invalidSceneIndex !== -1) {
            this._snackBar.openSnackBar('Cada escena necesita título, descripción, localización y al menos un personaje presente', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        const saveRequests = editableScenes.map(sceneGroup => {
            const sceneId = Number(sceneGroup.get('id')?.value ?? 0);
            const payload = this.buildScenePayload(sceneGroup);
            if (sceneId > 0)
                return this.sceneSrv.update(sceneId, payload);
            return this.isInterludeChapter
                ? this.sceneSrv.createForInterludeChapter(this.chapter.Id, payload)
                : this.sceneSrv.createForChapter(this.chapter.Id, payload);
        });
        const deleteRequests = [...new Set(this.deletedSceneIds)].map(sceneId => this.sceneSrv.delete(sceneId));

        forkJoin([...saveRequests, ...deleteRequests]).pipe(
            switchMap(() => this.bookSrv.getBook(this.book.Id))
        ).subscribe({
            next: book => {
                this.bookStore.setBook(book);
                this.bookEmmitterSrv.updateBook(book);
                this.book = book;
                this.chapter = this.isInterludeChapter ? this.bookStore.getInterludeChapter(this.chapter.Id) : this.bookStore.getChapter(this.chapter.Id);
                this.initializeForm();
                this._snackBar.openSnackBar('Escenas actualizadas', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this._snackBar.openSnackBar('Error al guardar escenas', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
