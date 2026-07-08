import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Book } from '../../../../interfaces/book';
import { Chapter } from '../../../../interfaces/chapter';
import { Scene, SceneCharacterDetail } from '../../../../interfaces/scene';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { catchError, debounceTime, finalize, forkJoin, map, merge, Observable, of, Subject, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { BookEmmitterService } from '../../../../services/emmitters/bookEmmitter.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SceneService } from '../../../../services/entities/scene.service';
import { ChapterWrite, InterludeChapterWrite, SceneWrite } from '../../../../interfaces/api-contract';
import { Character } from '../../../../interfaces/character';
import { ChapterService } from '../../../../services/entities/chapter.service';
import { CharacterOrderRefreshService } from '../../../../services/stores/character-order-refresh.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PendingChangesComponent } from '../../../../guards/pending-changes.guard';
import { NarrativeRtfEditorComponent } from '../../common/narrative-rtf-editor/narrative-rtf-editor.component';
import { buildNarrativeEntityLinks, NarrativeEntityLink } from '../../../../shared/narrative-entity-links';
import { htmlToRtf, plainTextToRtf, rtfToHtml, rtfToPlainText } from '../../../../shared/rtf/rtf-text';

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
        CommonModule, ReactiveFormsModule, SnackbarModule, DragDropModule, MatTooltipModule, NarrativeRtfEditorComponent],
    templateUrl: './chapter.component.html',
    styleUrl: './chapter.component.sass'
})
export class ChapterComponent implements OnInit, OnDestroy, PendingChangesComponent {
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
    errorEndPageMessage = '';
    endPage = new FormControl(`${this.chapter.PaginaFinal ?? this.chapter.Pagina}`, [
        Validators.pattern('^[1-9]{1,4}'),
        Validators.min(1),
        Validators.max(9999),
    ]);
    characterFilter = new FormControl('');
    scenes = this.fBuild.array([]);
    deletedSceneIds: number[] = [];
    isInterludeChapter = false;
    currentInterludeId: number | null = null;
    autosaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'invalid' = 'idle';
    characterOrderRefreshing$: Observable<boolean> = of(false);
    narrativeEntityLinks: NarrativeEntityLink[] = [];

    fgChapter = this.fBuild.group({
        name: this.name,
        order: this.order,
        page: this.page,
        endPage: this.endPage,
        scenes: this.scenes
    });

    get scenesControls(): FormArray {
        return this.fgChapter.get('scenes') as FormArray;
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (!this.hasPendingChanges())
            return;
        event.preventDefault();
        event.returnValue = '';
        return '';
    }

    private destroy$ = new Subject<void>();
    private isInitializingForm = false;
    private lastSavedSnapshot = '';
    private lastSavedChapterSnapshot = '';
    private lastSavedSceneSnapshots = new Map<number, string>();
    private autosaveQueued = false;
    private saveInProgress = false;
    private skipNextBookStoreSync = false;
    private activeChapterId: number | null = null;
    private bypassNextDeactivate = false;

    constructor(
        private bookStore: BookStoreService,
        private route: ActivatedRoute,
        private router: Router,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private bookEmmitterSrv: BookEmmitterService,
        private loader: LoaderEmmitterService,
        private sceneSrv: SceneService,
        private chapterSrv: ChapterService,
        private characterOrderRefreshSrv: CharacterOrderRefreshService
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
        merge(this.endPage.statusChanges, this.endPage.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEndPageErrorMessage());
        this.fgChapter.valueChanges
            .pipe(debounceTime(1800), takeUntilDestroyed())
            .subscribe(() => this.queueAutosave());
    }

    ngOnInit(): void {
        this.getViewportSize();
        this.route.params
            .pipe(takeUntil(this.destroy$))
            .subscribe((params) => {
                this.activeChapterId = params['cpid'] ? +params['cpid'] : null;
                this.currentInterludeId = params['iid'] ? +params['iid'] : null;
                this.isInterludeChapter = this.route.snapshot.routeConfig?.path?.startsWith('interlude_chapter') ?? false;
                this.isInterludeChapter = this.isInterludeChapter || this.route.snapshot.routeConfig?.path?.startsWith('interlude') === true;
                if (this.book.Id !== 0)
                    this.syncChapterFromBook();
            });

        this.bookStore.book$
            .pipe(takeUntil(this.destroy$))
            .subscribe((book) => {
                if (book.Id === 0)
                    return;
                this.book = book;
                this.narrativeEntityLinks = buildNarrativeEntityLinks(book);
                this.characterOrderRefreshing$ = this.characterOrderRefreshSrv.isRefreshing$(book.Id);
                if (this.skipNextBookStoreSync) {
                    this.skipNextBookStoreSync = false;
                    return;
                }
                if (this.activeChapterId && this.hasSameActiveChapter(book))
                    return;
                this.syncChapterFromBook();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private syncChapterFromBook(): void {
        if (this.activeChapterId) {
            this.chapter = this.isInterludeChapter
                ? this.bookStore.getInterludeChapter(this.activeChapterId)
                : this.bookStore.getChapter(this.activeChapterId);
            this.currentInterludeId = this.chapter.Id_Interludio ?? this.bookStore.getInterludeIdForChapter(this.activeChapterId);
        } else {
            const sourceChapters = this.isInterludeChapter && this.currentInterludeId
                ? (this.book.Interludios.find(interlude => interlude.Id === this.currentInterludeId)?.Capitulos ?? [])
                : this.book.Capitulos;
            const lastChapter = [...sourceChapters].sort((a, b) => Number(b.Orden) - Number(a.Orden))[0];
            const nextOrder = sourceChapters.length > 0
                ? Math.max(...sourceChapters.map(chapter => Number(chapter.Orden) || 0)) + 1
                : 1;
            const nextPage = Number(lastChapter?.PaginaFinal ?? lastChapter?.Pagina ?? 0) + 1;
            this.chapter = {
                Id: 0,
                Nombre: `Capítulo ${nextOrder}`,
                Orden: nextOrder,
                Pagina: nextPage,
                PaginaFinal: nextPage,
                EsInterludio: this.isInterludeChapter,
                Id_Interludio: this.currentInterludeId ?? undefined,
                Escenas: []
            }
        }
        this.initializeForm();
    }

    private hasSameActiveChapter(book: Book): boolean {
        if (!this.activeChapterId || !this.chapter.Id)
            return false;
        const incomingChapter = this.findChapterInBook(book, this.activeChapterId);
        if (!incomingChapter)
            return false;
        return this.createChapterDataSnapshot(incomingChapter) === this.createChapterDataSnapshot(this.chapter);
    }

    private findChapterInBook(book: Book, chapterId: number): Chapter | null {
        if (this.isInterludeChapter)
            return (book.Interludios ?? [])
                .flatMap(interlude => (interlude.Capitulos ?? []).map(chapter => ({
                    ...chapter,
                    EsInterludio: true,
                    Id_Interludio: chapter.Id_Interludio ?? interlude.Id
                })))
                .find(chapter => chapter.Id === chapterId) ?? null;
        return (book.Capitulos ?? []).find(chapter => chapter.Id === chapterId) ?? null;
    }

    private createChapterDataSnapshot(chapter: Chapter): string {
        return JSON.stringify({
            Id: chapter.Id,
            Nombre: chapter.Nombre,
            Orden: chapter.Orden,
            Pagina: chapter.Pagina,
            PaginaFinal: chapter.PaginaFinal ?? chapter.Pagina,
            EsInterludio: !!chapter.EsInterludio,
            Id_Interludio: chapter.Id_Interludio ?? null,
            Escenas: (chapter.Escenas ?? []).map(scene => ({
                Id: scene.Id,
                Nombre: scene.Nombre,
                Descripcion: scene.Descripcion,
                LocalizacionId: scene.Localizacion?.Id ?? null,
                Personajes: this.getSceneCharacterDetails(scene)
                    .map(character => ({ Id: Number(character.Id), Nombrado: !!character.Nombrado }))
                    .sort((a, b) => a.Id === b.Id
                        ? Number(a.Nombrado) - Number(b.Nombrado)
                        : a.Id - b.Id)
            }))
        });
    }

    initializeForm(): void {
        this.isInitializingForm = true;
        this.fgChapter.patchValue({
            name: this.chapter.Nombre !== '' ? this.chapter.Nombre : `Capítulo ${this.chapter.Orden}`,
            order: this.chapter.Orden.toString(),
            page: this.chapter.Pagina.toString(),
            endPage: (this.chapter.PaginaFinal ?? this.chapter.Pagina).toString(),
        }, { emitEvent: false });
        this.deletedSceneIds = [];
        (this.fgChapter.get('scenes') as FormArray).clear();
        if (this.chapter.Escenas && this.chapter.Escenas.length > 0) {
            this.chapter.Escenas.forEach(scene => {
                this.scenesControls.push(this.createSceneGroup(scene));
            });
        }
        if (this.scenesControls.length === 0)
            this.addScene();
        this.refreshSavedSnapshots();
        this.fgChapter.markAsPristine();
        this.autosaveStatus = 'idle';
        this.isInitializingForm = false;
    }

    createSceneGroup(data?: Scene, sceneNumber?: number): FormGroup {
        const sceneCharacters = this.getSceneCharacterDetails(data);
        const defaultSceneName = sceneNumber ? `Escena ${sceneNumber}` : '';
        const defaultSceneDescription = plainTextToRtf('Descripción de la escena');
        return this.fBuild.group({
            id: [data?.Id ?? 0],
            nombre: [data?.Nombre || defaultSceneName, [Validators.required, Validators.minLength(3)]],
            localizacion: [data?.Localizacion?.Id || (this.book.Localizaciones[0]?.Id || ''), Validators.required],
            descripcion: [data?.Descripcion || defaultSceneDescription, [this.sceneDescriptionValidator.bind(this)]],
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
        this.scenesControls.push(this.createSceneGroup(undefined, this.scenesControls.length + 1));
    }

    removeScene(index: number): void {
        const sceneId = Number(this.scenesControls.at(index).get('id')?.value ?? 0);
        if (sceneId > 0)
            this.deletedSceneIds.push(sceneId);
        this.scenesControls.removeAt(index);
    }

    isSceneValid(sceneGroup: FormGroup): boolean {
        const value = sceneGroup.value;
        const description = rtfToPlainText(value.descripcion ?? '');
        return value.nombre && value.nombre.trim().length > 3 && description.trim().length >= 15 && value.localizacion && this.hasPresentCharacter(sceneGroup);
    }

    isSceneEliminable(sceneGroup: FormGroup): boolean {
        const value = sceneGroup.value;
        const description = rtfToPlainText(value.descripcion ?? '');
        return Number(value.id ?? 0) === 0 && (!value.nombre || value.nombre.trim().length < 3) && (!description || description.trim().length < 15);
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

    updateEndPageErrorMessage() {
        if (this.endPage.hasError('min'))
            this.errorEndPageMessage = 'La página final no puede ser menor que uno';
        else if (this.endPage.hasError('max'))
            this.errorEndPageMessage = 'La página final máxima es 9999';
        else this.errorEndPageMessage = 'Página final no válida';
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
        const filter = this.normalizeSearch(this.characterFilter.value ?? '');
        this.getSortedCharacters()
            .filter(character => !filter || this.normalizeSearch(character.Nombre).includes(filter))
            .forEach(character => {
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
        return this.getSceneCharacters(sceneGroup).controls
            .filter(control => !!control.get('Nombrado')?.value === named)
            .sort((a, b) => String(a.get('Nombre')?.value ?? '').localeCompare(String(b.get('Nombre')?.value ?? '')));
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

    openNarrativeEntityLink(link: NarrativeEntityLink): void {
        const canLeave = this.canDeactivate();
        if (typeof canLeave === 'boolean') {
            if (canLeave)
                this.navigateToNarrativeEntityLink(link.targetUrl);
            return;
        }

        canLeave
            .pipe(takeUntil(this.destroy$))
            .subscribe(canNavigate => {
                if (canNavigate)
                    this.navigateToNarrativeEntityLink(link.targetUrl);
            });
    }

    getAssignmentData(characterGroup: any): ChapterCharacterAssignment {
        return {
            Id: Number(characterGroup.get('Id')?.value),
            Nombre: characterGroup.get('Nombre')?.value || this.getCharacterName(Number(characterGroup.get('Id')?.value)),
            Nombrado: !!characterGroup.get('Nombrado')?.value
        };
    }

    private normalizeSearch(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase()
            .trim();
    }

    private sceneDescriptionValidator(control: AbstractControl): ValidationErrors | null {
        const description = rtfToPlainText(control.value ?? '').trim();
        if (!description)
            return { required: true };
        if (description.length < 15)
            return { minlength: true };
        return null;
    }

    buildScenePayload(sceneGroup: FormGroup): SceneWrite {
        const value = sceneGroup.getRawValue();
        return {
            Nombre: value.nombre,
            Descripcion: this.normalizeSceneDescription(value.descripcion),
            Id_Localizacion: Number(value.localizacion),
            Personajes: this.getSelectedSceneCharacters(sceneGroup)
        };
    }

    canDeactivate(): boolean | Observable<boolean> {
        if (this.bypassNextDeactivate) {
            this.bypassNextDeactivate = false;
            return true;
        }

        if (!this.hasPendingChanges())
            return true;

        if (this.chapter.Id <= 0)
            return window.confirm('Hay un capítulo nuevo sin guardar. ¿Quieres salir sin guardarlo?');

        const editableScenes = this.getEditableScenes();
        const validationError = this.validateChapterForSave(editableScenes);
        if (validationError) {
            this.autosaveStatus = 'invalid';
            this._snackBar.openSnackBar(validationError, 'errorBar');
            return false;
        }

        return this.persistChapter(editableScenes, { skipFormSync: false }).pipe(
            map(() => true),
            catchError(() => {
                this.autosaveStatus = 'error';
                this._snackBar.openSnackBar('No se pudo autoguardar el capítulo antes de salir', 'errorBar');
                return of(false);
            })
        );
    }

    private navigateToNarrativeEntityLink(targetUrl: string): void {
        this.bypassNextDeactivate = true;
        this.router.navigateByUrl(targetUrl).then(navigated => {
            if (!navigated)
                this._snackBar.openSnackBar('No se pudo abrir la entidad narrativa enlazada', 'errorBar');
        });
    }

    setChapter(): void {
        const editableScenes = this.getEditableScenes();
        const validationError = this.validateChapterForSave(editableScenes);
        if (validationError) {
            this._snackBar.openSnackBar(validationError, 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.persistChapter(editableScenes, { skipFormSync: false }).subscribe({
            next: () => {
                this.initializeForm();
                this._snackBar.openSnackBar('Capítulo actualizado', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this._snackBar.openSnackBar('Error al guardar el capítulo', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    private queueAutosave(): void {
        if (this.isInitializingForm || this.chapter.Id <= 0 || !this.hasPendingChanges())
            return;

        const editableScenes = this.getEditableScenes();
        const validationError = this.validateChapterForSave(editableScenes);
        if (validationError) {
            this.autosaveStatus = 'invalid';
            return;
        }

        if (this.saveInProgress) {
            this.autosaveQueued = true;
            return;
        }

        this.runAutosave(editableScenes);
    }

    private runAutosave(editableScenes: FormGroup[]): void {
        this.saveInProgress = true;
        this.autosaveStatus = 'saving';
        this.persistChapter(editableScenes, { skipFormSync: true }).pipe(
            finalize(() => {
                this.saveInProgress = false;
                if (this.autosaveQueued) {
                    this.autosaveQueued = false;
                    this.queueAutosave();
                }
            })
        ).subscribe({
            next: () => {
                this.autosaveStatus = 'saved';
            },
            error: () => {
                this.skipNextBookStoreSync = false;
                this.autosaveStatus = 'error';
            }
        });
    }

    private getEditableScenes(): FormGroup[] {
        return this.scenesControls.controls
            .map((control, index) => {
                const sceneGroup = control as FormGroup;
                this.applySceneDefaults(sceneGroup, index + 1);
                return sceneGroup;
            })
            .filter(sceneGroup => !this.isSceneEliminable(sceneGroup));
    }

    private applySceneDefaults(sceneGroup: FormGroup, sceneNumber: number): void {
        const nameControl = sceneGroup.get('nombre');
        if (!String(nameControl?.value ?? '').trim())
            nameControl?.setValue(`Escena ${sceneNumber}`, { emitEvent: false });

        const descriptionControl = sceneGroup.get('descripcion');
        const description = rtfToPlainText(descriptionControl?.value ?? '').trim();
        if (!description)
            descriptionControl?.setValue(plainTextToRtf('Descripción de la escena'), { emitEvent: false });
    }

    private validateChapterForSave(editableScenes: FormGroup[]): string | null {
        if (this.name.invalid || this.order.invalid || this.page.invalid || this.endPage.invalid)
            return 'Revisa título, páginas y orden del capítulo';

        if (this.endPage.value && Number(this.endPage.value) < Number(this.page.value))
            return 'La página final no puede ser menor que la inicial';

        const invalidSceneIndex = editableScenes.findIndex(sceneGroup => sceneGroup.invalid || !this.hasPresentCharacter(sceneGroup));
        if (invalidSceneIndex !== -1)
            return 'Cada escena necesita título, descripción, localización y al menos un personaje presente';

        return null;
    }

    private persistChapter(editableScenes: FormGroup[], options: { skipFormSync: boolean }): Observable<Book> {
        if (options.skipFormSync)
            this.skipNextBookStoreSync = true;

        return this.saveChapterRequest().pipe(
            tap(savedChapter => this.applyChapterToLocalBook(savedChapter)),
            switchMap(savedChapter => this.saveScenesRequest(savedChapter, editableScenes)),
            map(() => this.book),
            tap(() => {
                this.skipNextBookStoreSync = true;
                this.bookStore.setBook(this.book);
                this.bookEmmitterSrv.updateBook(this.book);
                this.deletedSceneIds = [];
                this.refreshSavedSnapshots();
                this.fgChapter.markAsPristine();
            })
        );
    }

    private hasPendingChanges(): boolean {
        if (this.isInitializingForm)
            return false;
        return this.createFormSnapshot() !== this.lastSavedSnapshot;
    }

    private createFormSnapshot(): string {
        return JSON.stringify({
            chapterId: this.chapter.Id,
            isInterludeChapter: this.isInterludeChapter,
            currentInterludeId: this.currentInterludeId,
            chapter: this.createChapterSnapshot(),
            scenes: this.scenesControls.controls.map(control => this.createSceneSnapshot(control as FormGroup)),
            deletedSceneIds: [...new Set(this.deletedSceneIds)].sort((a, b) => a - b)
        });
    }

    private refreshSavedSnapshots(): void {
        this.lastSavedChapterSnapshot = this.createChapterSnapshot();
        this.lastSavedSceneSnapshots = new Map<number, string>();
        this.scenesControls.controls.forEach(control => {
            const sceneGroup = control as FormGroup;
            const sceneId = Number(sceneGroup.get('id')?.value ?? 0);
            if (sceneId > 0)
                this.lastSavedSceneSnapshots.set(sceneId, this.createSceneSnapshot(sceneGroup));
        });
        this.lastSavedSnapshot = this.createFormSnapshot();
    }

    private createChapterSnapshot(): string {
        return JSON.stringify({
            id: Number(this.chapter.Id ?? 0),
            nombre: this.name.value ?? '',
            pagina: Number(this.page.value),
            paginaFinal: this.endPage.value ? Number(this.endPage.value) : null,
            orden: Number(this.order.value),
            isInterludeChapter: this.isInterludeChapter,
            currentInterludeId: this.currentInterludeId
        });
    }

    private createSceneSnapshot(sceneGroup: FormGroup): string {
        const payload = this.buildScenePayload(sceneGroup);
        const sceneId = Number(sceneGroup.get('id')?.value ?? 0);
        return JSON.stringify({
            id: sceneId,
            nombre: payload.Nombre,
            descripcion: payload.Descripcion,
            localizacion: payload.Id_Localizacion,
            personajes: this.normalizeSceneCharactersSnapshot(payload.Personajes)
        });
    }

    private normalizeSceneCharactersSnapshot(characters: SceneWrite['Personajes']): SceneWrite['Personajes'] {
        return characters
            .map(character => ({
                Id: Number(character.Id),
                Nombrado: !!character.Nombrado
            }))
            .sort((a, b) => a.Id === b.Id
                ? Number(a.Nombrado) - Number(b.Nombrado)
                : a.Id - b.Id);
    }

    private normalizeSceneDescription(value: string | null | undefined): string {
        return htmlToRtf(rtfToHtml(value ?? ''));
    }

    private saveChapterRequest(): Observable<Chapter> {
        const payload: InterludeChapterWrite = {
            Nombre: this.name.value ?? '',
            Pagina: Number(this.page.value),
            Orden: Number(this.order.value)
        };
        if (this.endPage.value)
            payload.PaginaFinal = Number(this.endPage.value);

        if (this.chapter.Id > 0 && this.createChapterSnapshot() === this.lastSavedChapterSnapshot)
            return of(this.chapter);

        if (this.isInterludeChapter) {
            if (this.chapter.Id > 0)
                return this.chapterSrv.updateInterludeChapter(this.chapter.Id, payload);
            if (!this.currentInterludeId)
                return throwError(() => new Error('Missing interlude id'));
            return this.chapterSrv.createForInterlude(this.currentInterludeId, payload);
        }

        const normalPayload: ChapterWrite = { ...payload };
        if (this.chapter.Id > 0)
            return this.chapterSrv.update(this.chapter.Id, normalPayload);
        return this.chapterSrv.createForBook(this.book.Id, normalPayload);
    }

    private saveScenesRequest(savedChapter: Chapter, editableScenes: FormGroup[]): Observable<unknown> {
        const targetChapterId = savedChapter.Id;
        const saveRequests = editableScenes
            .filter(sceneGroup => this.shouldSaveScene(sceneGroup))
            .map(sceneGroup => {
                const sceneId = Number(sceneGroup.get('id')?.value ?? 0);
                const payload = this.buildScenePayload(sceneGroup);
                if (sceneId > 0)
                    return this.sceneSrv.update(sceneId, payload).pipe(tap(scene => this.applySceneWriteResponse(scene, targetChapterId)));
                const createRequest = this.isInterludeChapter
                    ? this.sceneSrv.createForInterludeChapter(savedChapter.Id, payload)
                    : this.sceneSrv.createForChapter(savedChapter.Id, payload);
                return createRequest.pipe(tap(scene => {
                    sceneGroup.get('id')?.setValue(scene.Id, { emitEvent: false });
                    this.applySceneWriteResponse(scene, targetChapterId);
                }));
            });
        const deleteRequests = [...new Set(this.deletedSceneIds)]
            .map(sceneId => this.sceneSrv.delete(sceneId).pipe(tap(() => {
                this.removeSceneFromLocalBook(targetChapterId, sceneId);
                this.queueCharacterOrderRefresh();
            })));
        const requests = [...saveRequests, ...deleteRequests];
        return requests.length ? forkJoin(requests) : of(savedChapter);
    }

    private shouldSaveScene(sceneGroup: FormGroup): boolean {
        const sceneId = Number(sceneGroup.get('id')?.value ?? 0);
        if (sceneId <= 0)
            return true;
        return this.createSceneSnapshot(sceneGroup) !== this.lastSavedSceneSnapshots.get(sceneId);
    }

    private applySceneWriteResponse(scene: Scene, chapterId: number): void {
        this.upsertSceneInLocalBook(chapterId, scene);
        this.queueCharacterOrderRefresh();
    }

    private queueCharacterOrderRefresh(): void {
        if (this.book.Id > 0)
            this.characterOrderRefreshSrv.refresh(this.book.Id);
    }

    private applyChapterToLocalBook(savedChapter: Chapter): void {
        const chapter = this.mergeSavedChapter(savedChapter);
        if (this.isInterludeChapter)
            this.book = {
                ...this.book,
                Interludios: this.book.Interludios.map(interlude => interlude.Id === (chapter.Id_Interludio ?? this.currentInterludeId)
                    ? { ...interlude, Capitulos: this.upsertChapter(interlude.Capitulos ?? [], chapter) }
                    : interlude)
            };
        else
            this.book = {
                ...this.book,
                Capitulos: this.upsertChapter(this.book.Capitulos, chapter)
            };

        if (!this.activeChapterId || this.activeChapterId === chapter.Id) {
            this.chapter = chapter;
            if (chapter.Id > 0)
                this.activeChapterId = chapter.Id;
        }
    }

    private mergeSavedChapter(savedChapter: Chapter): Chapter {
        const previousChapter = this.findLocalChapter(savedChapter.Id);
        return {
            ...previousChapter,
            ...savedChapter,
            EsInterludio: this.isInterludeChapter,
            Id_Interludio: savedChapter.Id_Interludio ?? previousChapter?.Id_Interludio ?? this.currentInterludeId ?? undefined,
            Escenas: savedChapter.Escenas?.length
                ? savedChapter.Escenas
                : previousChapter?.Escenas ?? this.chapter.Escenas ?? []
        };
    }

    private findLocalChapter(chapterId: number): Chapter | null {
        if (this.isInterludeChapter)
            return this.book.Interludios
                .flatMap(interlude => (interlude.Capitulos ?? []).map(chapter => ({
                    ...chapter,
                    EsInterludio: true,
                    Id_Interludio: chapter.Id_Interludio ?? interlude.Id
                })))
                .find(chapter => chapter.Id === chapterId) ?? null;
        return this.book.Capitulos.find(chapter => chapter.Id === chapterId) ?? null;
    }

    private upsertChapter(chapters: Chapter[], chapter: Chapter): Chapter[] {
        const exists = chapters.some(item => item.Id === chapter.Id);
        const next = exists
            ? chapters.map(item => item.Id === chapter.Id ? chapter : item)
            : [...chapters, chapter];
        return next.sort((a, b) => Number(a.Orden) - Number(b.Orden));
    }

    private upsertSceneInLocalBook(chapterId: number, scene: Scene): void {
        const targetChapter = this.findLocalChapter(chapterId) ?? this.chapter;
        const chapter = this.mergeSavedChapter({
            ...targetChapter,
            Escenas: this.upsertScene(targetChapter.Escenas ?? [], scene)
        });
        this.applyChapterToLocalBook(chapter);
    }

    private removeSceneFromLocalBook(chapterId: number, sceneId: number): void {
        const targetChapter = this.findLocalChapter(chapterId) ?? this.chapter;
        const chapter = this.mergeSavedChapter({
            ...targetChapter,
            Escenas: (targetChapter.Escenas ?? []).filter(scene => scene.Id !== sceneId)
        });
        this.applyChapterToLocalBook(chapter);
    }

    private upsertScene(scenes: Scene[], scene: Scene): Scene[] {
        const exists = scenes.some(item => item.Id === scene.Id);
        return exists
            ? scenes.map(item => item.Id === scene.Id ? scene : item)
            : [...scenes, scene];
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
