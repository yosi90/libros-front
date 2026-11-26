import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Character } from '../../../../interfaces/character';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { rtfToPlainText } from '../../../../shared/rtf/rtf-text';
import {
    EditorMention, EditorMentionKey, NarrativeRtfEditorComponent
} from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { ChapterComponent } from '../../../shared/book-pages/chapter/chapter.component';

/**
 * Capítulo en Web, «Cuaderno» (F2 del rediseño de la vista de libro): el capítulo se lee como un documento. Cada escena,
 * entera y en serif, con su número a la izquierda y, al margen (debajo en el móvil), su lugar y su reparto. Al pulsar
 * el texto se escribe ahí mismo, una escena a la vez. El lugar y el reparto se eligen en un desplegable junto a ellos
 * (hoja desde abajo en el móvil); la @ del texto también añade personajes. No hay botón de guardar: se guarda solo, y
 * una escena a medias se queda en el dispositivo hasta que está completa.
 */
@Component({
    selector: 'app-web-chapter-view',
    standalone: true,
    imports: [A11yModule, OverlayModule, CommonModule, ReactiveFormsModule, MatIconModule, MatMenuModule, MatTooltipModule, NarrativeRtfEditorComponent],
    templateUrl: './web-chapter-view.component.html',
    styleUrl: './web-chapter-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebChapterViewComponent {
    @Input({ required: true }) controller!: ChapterComponent;

    /** La @ que se escribe en la escena abierta, y la opción marcada con las flechas. */
    mention: EditorMention | null = null;
    mentionActive = 0;
    /** La escena cuyo lugar se está eligiendo, y lo escrito en su buscador. */
    placesSceneIndex: number | null = null;
    readonly placesQuery = new FormControl('');

    constructor(private host: ElementRef<HTMLElement>, private layout: AdaptiveLayoutService) { }

    get c(): ChapterComponent { return this.controller; }

    get isNew(): boolean { return this.c.chapter.Id <= 0; }

    /** En el móvil el reparto y el lugar son hojas desde abajo; con más ancho, desplegables junto a su botón. */
    get isCompact(): boolean { return this.layout.snapshot.isCompact; }

    get chapterNumber(): string {
        return String(this.c.order.value ?? '').trim() || String(this.c.chapter.Orden || '');
    }

    /** «págs. 1–14» (o «pág. 3»), solo con páginas válidas. */
    get pagesLabel(): string {
        return this.c.getChapterSubtitle().split(' · ').filter(part => part.startsWith('pág')).join('');
    }

    /** El desplegable, debajo de su botón (o encima si no cabe), alineado por su izquierda o su derecha. */
    readonly pickerPositions: ConnectedPosition[] = [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 }
    ];

    /** La tarjeta de la @, debajo de la línea de la @ (o encima si no cabe). */
    readonly mentionPositions: ConnectedPosition[] = [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 }
    ];

    sceneName(scene: AbstractControl, index: number): string {
        return String(scene.get('nombre')?.value ?? '').trim() || `Escena ${index + 1}`;
    }

    hasText(scene: AbstractControl): boolean {
        return !!rtfToPlainText(scene.get('descripcion')?.value ?? '').trim();
    }

    placeName(scene: AbstractControl): string {
        return this.c.displaySceneLocation(scene.get('localizacion')?.value) || 'Sin localización';
    }

    isPlaceChosen(scene: AbstractControl, locationId: number): boolean {
        return Number(scene.get('localizacion')?.value) === Number(locationId);
    }

    /** El lápiz o «Hecho»: despliega (o pliega) los datos del capítulo y, al desplegarlos, lleva el foco a su título. */
    toggleChapterData(): void {
        this.c.toggleChapterFields();
        if (!this.c.isChapterSummaryVisible())
            setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.chapter-fields__title')?.focus());
    }

    addScene(): void {
        if (!this.c.addScene())
            return;
        const index = this.c.scenesControls.length - 1;
        setTimeout(() => {
            const scene = this.host.nativeElement.querySelector<HTMLElement>(`[data-scene-index="${index}"]`);
            if (scene)
                this.scrollContentTo(scene);
            scene?.querySelector<HTMLInputElement>('.scene__title-input')?.focus({ preventScroll: true });
        });
    }

    /** Abre la escena para escribir y deja el cursor al final de su texto. */
    openScene(index: number): void {
        this.mention = null;
        this.c.openScene(index);
        setTimeout(() => {
            const editor = this.host.nativeElement.querySelector<HTMLElement>(`[data-scene-index="${index}"] .scene__editor .rtf-editor`);
            if (!editor)
                return;
            editor.focus({ preventScroll: true });
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        });
    }

    /** Un clic en el texto leído abre la escena, salvo si era un enlace a un elemento o una selección de texto. */
    openSceneFromText(index: number, event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        if (event.defaultPrevented || target?.closest('.rtf-narrative-link') || window.getSelection()?.toString())
            return;
        this.openScene(index);
    }

    openCast(index: number): void {
        this.closePlaces();
        this.c.openCastSheet(index);
    }

    closeCastOnEscape(event: KeyboardEvent): void {
        if (event.key === 'Escape')
            this.c.closeCharacterPicker();
    }

    /** «Crear «…»» del reparto: entra ya en escena y el buscador se vacía. */
    createFromCast(scene: AbstractControl, name: string): void {
        this.c.createSceneCharacter(scene, name, () => this.c.characterPickerQuery.setValue(''));
    }

    // --- El lugar de la escena. ---

    openPlaces(index: number): void {
        this.c.closeCharacterPicker();
        this.placesQuery.setValue('');
        this.placesSceneIndex = this.placesSceneIndex === index ? null : index;
    }

    closePlaces(): void {
        this.placesSceneIndex = null;
        this.placesQuery.setValue('');
    }

    closePlacesOnEscape(event: KeyboardEvent): void {
        if (event.key === 'Escape')
            this.closePlaces();
    }

    choosePlace(scene: AbstractControl, locationId: number): void {
        this.c.chooseSceneLocation(scene, locationId);
        this.closePlaces();
    }

    createPlace(scene: AbstractControl, name: string): void {
        this.c.createSceneLocation(scene, name, () => this.closePlaces());
    }

    // --- La @ del texto. ---

    get mentionOptions(): Character[] {
        return this.mention ? this.c.getMentionOptions(this.mention.query) : [];
    }

    get mentionCreateName(): string | null {
        return this.mention ? this.c.getCastNameToCreate(this.mention.query) : null;
    }

    /** Hay algo que ofrecer: la tarjeta se ve y se lleva las flechas e Intro. */
    get mentionVisible(): boolean {
        return !!this.mention && (this.mentionOptions.length > 0 || !!this.mentionCreateName);
    }

    /** Dónde se ancla la tarjeta: la @ en la pantalla (se guarda para no recolocarla en cada comprobación). */
    mentionOrigin = { x: 0, y: 0, width: 1, height: 0 };

    onMentionChange(mention: EditorMention | null): void {
        if (mention?.query !== this.mention?.query)
            this.mentionActive = 0;
        if (mention)
            this.mentionOrigin = { x: mention.x, y: mention.y, width: 1, height: mention.height };
        this.mention = mention;
    }

    onMentionKey(scene: AbstractControl, key: EditorMentionKey): void {
        const count = this.mentionOptions.length + (this.mentionCreateName ? 1 : 0);
        if (key === 'close') {
            this.mention = null;
            return;
        }
        if (!count)
            return;
        if (key === 'next' || key === 'previous') {
            this.mentionActive = (this.mentionActive + (key === 'next' ? 1 : -1) + count) % count;
            return;
        }
        const option = this.mentionOptions[this.mentionActive];
        if (option)
            this.chooseMention(scene, option, false);
        else
            this.createFromMention(scene);
    }

    /** Tocar el nombre lo pone en escena; la @ de la derecha, como solo nombrado. Lo escrito desde la @ pasa a ser su nombre. */
    chooseMention(scene: AbstractControl, character: Character, named: boolean): void {
        this.openEditor?.completeMention(character.Nombre);
        this.c.assignCharacterById(scene, character.Id, named);
        this.mention = null;
    }

    createFromMention(scene: AbstractControl): void {
        const name = this.mentionCreateName;
        if (!name || this.c.creatingSceneCharacter)
            return;
        this.openEditor?.completeMention(name);
        this.mention = null;
        this.c.createSceneCharacter(scene, name);
    }

    /** El editor de la escena abierta (las demás se leen con editores de solo lectura). */
    @ViewChild('openSceneEditor', { read: NarrativeRtfEditorComponent }) private openEditor?: NarrativeRtfEditorComponent;

    /** Solo desplaza el contenido del libro (`scrollIntoView` movería también la página y dejaría ver el fondo). */
    private scrollContentTo(element: HTMLElement): void {
        const scroller = element.closest<HTMLElement>('.book__content');
        if (!scroller) {
            element.scrollIntoView({ behavior: this.motion, block: 'nearest' });
            return;
        }
        const top = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8;
        scroller.scrollBy({ top, behavior: this.motion });
    }

    private get motion(): ScrollBehavior {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    }
}
