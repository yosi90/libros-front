import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { A11yModule } from '@angular/cdk/a11y';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Character } from '../../../../interfaces/character';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import {
    EditorMention, EditorMentionKey, NarrativeRtfEditorComponent
} from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { ChapterComponent } from '../../../shared/book-pages/chapter/chapter.component';

/**
 * Capítulo en Web, «Escenas plegadas» (rediseño del 6/11/2026, igual que la APK): arriba el título del capítulo con sus
 * páginas y el lápiz de sus datos; cada escena, una tarjeta plegada (número, título, localización, un extracto y sus
 * personajes) y solo la que se edita se despliega; «+ Escena» al final. El «+» de la escena abre su reparto (buscador y
 * todos los personajes, cada uno con los iconos de en escena y de la @) y en el texto la @ añade personajes. En
 * escritorio con ratón queda además el panel fijo de personajes para arrastrarlos a una escena.
 */
@Component({
    selector: 'app-web-chapter-view',
    standalone: true,
    imports: [A11yModule, OverlayModule, CommonModule, ReactiveFormsModule, DragDropModule, MatAutocompleteModule, MatIconModule, MatMenuModule,
        MatTooltipModule, NarrativeRtfEditorComponent],
    templateUrl: './web-chapter-view.component.html',
    styleUrl: './web-chapter-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebChapterViewComponent {
    @Input({ required: true }) controller!: ChapterComponent;
    @ViewChild(NarrativeRtfEditorComponent) private sceneEditor?: NarrativeRtfEditorComponent;

    /** La @ que se escribe en la escena desplegada, y la opción marcada con las flechas. */
    mention: EditorMention | null = null;
    mentionActive = 0;

    constructor(private host: ElementRef<HTMLElement>, private layout: AdaptiveLayoutService) { }

    get c(): ChapterComponent { return this.controller; }

    get isNew(): boolean { return this.c.chapter.Id <= 0; }

    /** En el móvil el reparto es una hoja desde abajo; con más ancho, un desplegable junto al «+». */
    get isCompact(): boolean { return this.layout.snapshot.isCompact; }

    /** El reparto, debajo del «+» (o encima si no cabe), alineado por su izquierda o su derecha. */
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

    /** El lápiz: despliega (o pliega) los datos del capítulo y, al desplegarlos, lleva el foco a su título. */
    toggleChapterData(): void {
        this.c.toggleChapterFields();
        if (!this.c.isChapterSummaryVisible())
            setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.chapter__title')?.focus());
    }

    addScene(): void {
        if (!this.c.addScene())
            return;
        const index = this.c.scenesControls.length - 1;
        setTimeout(() => {
            const scene = this.host.nativeElement.querySelector<HTMLElement>(`[data-scene-index="${index}"]`);
            scene?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            scene?.querySelector<HTMLInputElement>('.scene__title')?.focus({ preventScroll: true });
        });
    }

    openScene(index: number): void {
        this.mention = null;
        this.c.openScene(index);
    }

    closeCastOnEscape(event: KeyboardEvent): void {
        if (event.key === 'Escape')
            this.c.closeCharacterPicker();
    }

    /** «Crear «…»» del reparto: entra ya en escena y el buscador se vacía. */
    createFromCast(scene: AbstractControl, name: string): void {
        this.c.createSceneCharacter(scene, name, () => this.c.characterPickerQuery.setValue(''));
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
        this.sceneEditor?.completeMention(character.Nombre);
        this.c.assignCharacterById(scene, character.Id, named);
        this.mention = null;
    }

    createFromMention(scene: AbstractControl): void {
        const name = this.mentionCreateName;
        if (!name || this.c.creatingSceneCharacter)
            return;
        this.sceneEditor?.completeMention(name);
        this.mention = null;
        this.c.createSceneCharacter(scene, name);
    }
}
