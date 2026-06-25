import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { forkJoin, merge, Observable, of, Subject, switchMap, throwError } from 'rxjs';
import { BookEmmitterService } from '../../../../services/emmitters/bookEmmitter.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SceneService } from '../../../../services/entities/scene.service';
import { ChapterWrite, InterludeChapterWrite, SceneWrite } from '../../../../interfaces/api-contract';
import { BookService } from '../../../../services/entities/book.service';
import { Character } from '../../../../interfaces/character';
import { ChapterService } from '../../../../services/entities/chapter.service';

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

    private destroy$ = new Subject<void>();

    constructor(
        private bookStore: BookStoreService,
        private route: ActivatedRoute,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private bookEmmitterSrv: BookEmmitterService,
        private loader: LoaderEmmitterService,
        private sceneSrv: SceneService,
        private bookSrv: BookService,
        private chapterSrv: ChapterService
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
    }

    ngOnInit(): void {
        this.getViewportSize();
        this.route.params.subscribe((params) => {
            const chapterId = +params['cpid'];
            this.currentInterludeId = params['iid'] ? +params['iid'] : null;
            this.isInterludeChapter = this.route.snapshot.routeConfig?.path?.startsWith('interlude_chapter') ?? false;
            this.isInterludeChapter = this.isInterludeChapter || this.route.snapshot.routeConfig?.path?.startsWith('interlude') === true;
            this.bookStore.book$.subscribe((book) => {
                if (book.Id === 0) return;
                this.book = book;
                if (chapterId) {
                    this.chapter = this.isInterludeChapter ? this.bookStore.getInterludeChapter(chapterId) : this.bookStore.getChapter(chapterId);
                    this.currentInterludeId = this.chapter.Id_Interludio ?? this.bookStore.getInterludeIdForChapter(chapterId);
                } else {
                    const sourceChapters = this.isInterludeChapter && this.currentInterludeId
                        ? (book.Interludios.find(interlude => interlude.Id === this.currentInterludeId)?.Capitulos ?? [])
                        : book.Capitulos;
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
            endPage: (this.chapter.PaginaFinal ?? this.chapter.Pagina).toString(),
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
            descripcion: [data?.Descripcion || '', [this.sceneDescriptionValidator.bind(this)]],
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
        const description = this.rtfToPlainText(value.descripcion ?? '');
        return value.nombre && value.nombre.trim().length > 3 && description.trim().length >= 15 && value.localizacion && this.hasPresentCharacter(sceneGroup);
    }

    isSceneEliminable(sceneGroup: FormGroup): boolean {
        const value = sceneGroup.value;
        const description = this.rtfToPlainText(value.descripcion ?? '');
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

    getAssignmentData(characterGroup: any): ChapterCharacterAssignment {
        return {
            Id: Number(characterGroup.get('Id')?.value),
            Nombre: characterGroup.get('Nombre')?.value || this.getCharacterName(Number(characterGroup.get('Id')?.value)),
            Nombrado: !!characterGroup.get('Nombrado')?.value
        };
    }

    getSceneDescriptionText(sceneGroup: any): string {
        return this.rtfToPlainText(sceneGroup.get('descripcion')?.value ?? '');
    }

    updateSceneDescriptionFromEditor(sceneGroup: any, event: Event): void {
        const element = event.target as HTMLElement;
        sceneGroup.get('descripcion')?.setValue(this.plainTextToRtf(element.innerText || ''));
    }

    private normalizeSearch(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase()
            .trim();
    }

    private plainTextToRtf(value: string): string {
        const escaped = value
            .replace(/\\/g, '\\\\')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/\r?\n/g, '\\par ');
        return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Microsoft Sans Serif;}}\\viewkind4\\uc1\\pard\\f0\\fs24 ${escaped}\\par}`;
    }

    private sceneDescriptionValidator(control: AbstractControl): ValidationErrors | null {
        const description = this.rtfToPlainText(control.value ?? '').trim();
        if (!description)
            return { required: true };
        if (description.length < 15)
            return { minlength: true };
        return null;
    }

    private rtfToPlainText(value: string): string {
        if (!value.trim().startsWith('{\\rtf'))
            return value;

        return this.stripRtfGroups(value, ['\\fonttbl', '\\colortbl', '\\*\\generator'])
            .replace(/\\par[d]?/g, '\n')
            .replace(/\\line/g, '\n')
            .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/\\u(-?\d+)\??/g, (_, code) => String.fromCharCode(Number(code)))
            .replace(/\\[a-zA-Z]+-?\d*/g, '')
            .replace(/[{}]/g, '')
            .replace(/\\([{}\\])/g, '$1')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    private stripRtfGroups(value: string, groupMarkers: string[]): string {
        let result = '';
        for (let index = 0; index < value.length; index++) {
            if (value[index] !== '{') {
                result += value[index];
                continue;
            }

            const remaining = value.slice(index + 1);
            const shouldStrip = groupMarkers.some(marker => remaining.startsWith(marker));
            if (!shouldStrip) {
                result += value[index];
                continue;
            }

            let depth = 1;
            index++;
            while (index < value.length && depth > 0) {
                if (value[index] === '{')
                    depth++;
                else if (value[index] === '}')
                    depth--;
                index++;
            }
            index--;
        }
        return result;
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
        const editableScenes = this.scenesControls.controls
            .map(control => control as FormGroup)
            .filter(sceneGroup => !this.isSceneEliminable(sceneGroup));

        if (this.name.invalid || this.order.invalid || this.page.invalid || (!this.isInterludeChapter && this.endPage.invalid)) {
            this._snackBar.openSnackBar('Revisa título, páginas y orden del capítulo', 'errorBar');
            return;
        }

        if (!this.isInterludeChapter && this.endPage.value && Number(this.endPage.value) < Number(this.page.value)) {
            this._snackBar.openSnackBar('La página final no puede ser menor que la inicial', 'errorBar');
            return;
        }

        const invalidSceneIndex = editableScenes.findIndex(sceneGroup => sceneGroup.invalid || !this.hasPresentCharacter(sceneGroup));
        if (invalidSceneIndex !== -1) {
            this._snackBar.openSnackBar('Cada escena necesita título, descripción, localización y al menos un personaje presente', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.saveChapterRequest().pipe(
            switchMap(savedChapter => this.saveScenesRequest(savedChapter, editableScenes)),
            switchMap(() => this.bookSrv.getBook(this.book.Id))
        ).subscribe({
            next: book => {
                this.bookStore.setBook(book);
                this.bookEmmitterSrv.updateBook(book);
                this.book = book;
                this.chapter = this.isInterludeChapter ? this.bookStore.getInterludeChapter(this.chapter.Id) : this.bookStore.getChapter(this.chapter.Id);
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

    private saveChapterRequest(): Observable<Chapter> {
        const payload: InterludeChapterWrite = {
            Nombre: this.name.value ?? '',
            Pagina: Number(this.page.value),
            Orden: Number(this.order.value)
        };

        if (this.isInterludeChapter) {
            if (this.chapter.Id > 0)
                return this.chapterSrv.updateInterludeChapter(this.chapter.Id, payload);
            if (!this.currentInterludeId)
                return throwError(() => new Error('Missing interlude id'));
            return this.chapterSrv.createForInterlude(this.currentInterludeId, payload);
        }

        const normalPayload: ChapterWrite = { ...payload };
        if (this.endPage.value)
            normalPayload.PaginaFinal = Number(this.endPage.value);
        if (this.chapter.Id > 0)
            return this.chapterSrv.update(this.chapter.Id, normalPayload);
        return this.chapterSrv.createForBook(this.book.Id, normalPayload);
    }

    private saveScenesRequest(savedChapter: Chapter, editableScenes: FormGroup[]): Observable<unknown> {
        this.chapter = { ...savedChapter, Escenas: savedChapter.Escenas ?? [] };
        const saveRequests = editableScenes.map(sceneGroup => {
            const sceneId = Number(sceneGroup.get('id')?.value ?? 0);
            const payload = this.buildScenePayload(sceneGroup);
            if (sceneId > 0)
                return this.sceneSrv.update(sceneId, payload);
            return this.isInterludeChapter
                ? this.sceneSrv.createForInterludeChapter(savedChapter.Id, payload)
                : this.sceneSrv.createForChapter(savedChapter.Id, payload);
        });
        const deleteRequests = [...new Set(this.deletedSceneIds)].map(sceneId => this.sceneSrv.delete(sceneId));
        const requests = [...saveRequests, ...deleteRequests];
        return requests.length ? forkJoin(requests) : of(savedChapter);
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
