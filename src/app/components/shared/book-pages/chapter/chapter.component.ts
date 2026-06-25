import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
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
import { Character } from '../../../../interfaces/character';

interface ChapterCharacterAssignment {
    Id: number;
    Nombre: string;
    Nombrado: boolean;
}

interface ChapterCharacterGroup {
    label: string;
    characters: Character[];
}

type ChapterCharacterUsage = 'present' | 'named' | null;

@Component({
    standalone: true,
    selector: 'app-chapter',
    imports: [MatInputModule, MatSelectModule, MatButtonModule, MatFormFieldModule, FormsModule, MatIconModule,
        CommonModule, ReactiveFormsModule, SnackbarModule, DragDropModule],
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
                    const lastChapter = book.Capitulos[book.Capitulos.length - 1];
                    this.chapter = {
                        Id: 0,
                        Nombre: `Capítulo ${book.Capitulos.length + 1}`,
                        Orden: book.Capitulos.length + 1,
                        Pagina: Number(lastChapter?.Pagina ?? 0) + 1,
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
                sceneCharacters.map(sceneCharacter => this.createSceneCharacterGroup(sceneCharacter))
            )
        });
    }

    createSceneCharacterGroup(sceneCharacter: SceneCharacterDetail): FormGroup {
        return this.fBuild.group({
            Id: [sceneCharacter.Id, Validators.required],
            Nombre: [this.getCharacterName(sceneCharacter.Id)],
            Nombrado: [sceneCharacter.Nombrado ?? false]
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
        return characters.controls.some(control => !control.get('Nombrado')?.value);
    }

    getSortedCharacters() {
        return [...this.book.Personajes].sort((a, b) => {
            const orderA = a.OrdenGrupo ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.OrdenGrupo ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB)
                return orderA - orderB;
            return a.Nombre.localeCompare(b.Nombre);
        });
    }

    getCharacterGroups(): ChapterCharacterGroup[] {
        const groups = new Map<string, Character[]>();
        this.getSortedCharacters().forEach(character => {
            const label = character.Grupo || 'Sin grupo';
            groups.set(label, [...(groups.get(label) || []), character]);
        });

        return [...groups.entries()]
            .map(([label, characters]) => ({ label, characters }))
            .sort((a, b) => {
                const orderA = Math.min(...a.characters.map(character => character.OrdenGrupo ?? Number.MAX_SAFE_INTEGER));
                const orderB = Math.min(...b.characters.map(character => character.OrdenGrupo ?? Number.MAX_SAFE_INTEGER));
                if (orderA !== orderB)
                    return orderA - orderB;
                return a.label.localeCompare(b.label);
            });
    }

    getCharacterDragData(character: Character): ChapterCharacterAssignment {
        return {
            Id: character.Id,
            Nombre: character.Nombre,
            Nombrado: false
        };
    }

    getCharacterUsage(characterId: number): ChapterCharacterUsage {
        let isNamed = false;
        for (const scene of this.scenesControls.controls) {
            const characters = this.getSceneCharacters(scene as FormGroup);
            for (const character of characters.controls) {
                if (Number(character.get('Id')?.value) !== characterId)
                    continue;
                if (!character.get('Nombrado')?.value)
                    return 'present';
                isNamed = true;
            }
        }
        return isNamed ? 'named' : null;
    }

    getAssignedCharactersCount(): number {
        const ids = new Set<number>();
        this.scenesControls.controls.forEach(scene => {
            this.getSceneCharacters(scene as FormGroup).controls.forEach(character => ids.add(Number(character.get('Id')?.value)));
        });
        return ids.size;
    }

    getCharacterName(characterId: number): string {
        return this.book.Personajes.find(character => character.Id === characterId)?.Nombre || `Personaje ${characterId}`;
    }

    getSceneCharacters(sceneGroup: any): FormArray {
        return sceneGroup.get('personajes') as FormArray;
    }

    getSceneCharactersByMention(sceneGroup: any, named: boolean) {
        return this.getSceneCharacters(sceneGroup).controls.filter(control => !!control.get('Nombrado')?.value === named);
    }

    getSelectedSceneCharacters(sceneGroup: FormGroup): SceneWrite['Personajes'] {
        const characters = sceneGroup.get('personajes') as FormArray;
        return characters.controls
            .map(control => ({
                Id: Number(control.get('Id')?.value),
                Nombrado: !!control.get('Nombrado')?.value
            }));
    }

    dropCharacter(event: CdkDragDrop<unknown>, sceneIndex: number, named: boolean): void {
        const character = event.item.data as ChapterCharacterAssignment | undefined;
        if (!character?.Id)
            return;
        const sceneGroup = this.scenesControls.at(sceneIndex) as FormGroup;
        this.assignCharacterToScene(sceneGroup, character, named);
    }

    assignCharacterToScene(sceneGroup: FormGroup, character: ChapterCharacterAssignment, named: boolean): void {
        const characters = this.getSceneCharacters(sceneGroup);
        const existing = characters.controls.find(control => Number(control.get('Id')?.value) === Number(character.Id));
        if (existing) {
            existing.get('Nombrado')?.setValue(named);
            return;
        }
        characters.push(this.fBuild.group({
            Id: [Number(character.Id), Validators.required],
            Nombre: [character.Nombre || this.getCharacterName(Number(character.Id))],
            Nombrado: [named]
        }));
    }

    removeSceneCharacter(sceneGroup: any, characterId: number): void {
        const characters = this.getSceneCharacters(sceneGroup);
        const index = characters.controls.findIndex(control => Number(control.get('Id')?.value) === Number(characterId));
        if (index !== -1)
            characters.removeAt(index);
    }

    getAssignmentData(characterGroup: any): ChapterCharacterAssignment {
        return {
            Id: Number(characterGroup.get('Id')?.value),
            Nombre: characterGroup.get('Nombre')?.value || this.getCharacterName(Number(characterGroup.get('Id')?.value)),
            Nombrado: !!characterGroup.get('Nombrado')?.value
        };
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
