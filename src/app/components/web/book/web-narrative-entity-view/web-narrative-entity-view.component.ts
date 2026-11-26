import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NarrativeRtfEditorComponent } from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { NarrativeEntityPlaceholderComponent } from '../../../shared/book-pages/narrative-entity-placeholder/narrative-entity-placeholder.component';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { ModalDialogDirective } from '../../ui/modal-dialog.directive';
import { foldText } from '../../../../shared/text';
import { sceneCastDetails } from '../../../../shared/scene-cast';
import type { Chapter } from '../../../../interfaces/chapter';

interface ListGroup { label: string; items: any[] }
interface Appearance { chapter: Chapter; named: boolean }

/**
 * Elementos en Web («Cuaderno», F3): la lista del tipo activo y, desde 600 px, su ficha al lado; en el móvil, la lista y,
 * al tocar, la ficha. La ficha se edita en el sitio y se guarda sola (sin «Guardar cambios»): el nombre al salir del
 * campo (en personajes, eligiendo si se llama así desde este libro o estaba mal escrito), lo demás al cambiarlo. Las
 * entradas se leen enteras y se escribe en una a la vez. El alta rápida es un `<dialog>` nativo con lo mínimo.
 */
@Component({
    selector: 'app-web-narrative-entity-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatMenuModule, MatTooltipModule, NarrativeRtfEditorComponent, ModalDialogDirective],
    templateUrl: './web-narrative-entity-view.component.html',
    styleUrl: './web-narrative-entity-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebNarrativeEntityViewComponent {
    @Input({ required: true }) controller!: NarrativeEntityPlaceholderComponent;

    readonly query = new FormControl('');
    /** La entrada que se está escribiendo; las demás se leen. */
    openEntryIndex: number | null = null;
    /** La entrada por defecto de un elemento sin entradas solo aparece al pulsar «+ Entrada». */
    revealedPlaceholder = false;
    /** El buscador de «+ Relación», abierto. */
    relationPickerOpen = false;
    readonly aliasDraft = new FormControl('');

    private appearanceSource: unknown = null;
    private appearanceCache = new Map<number, Appearance[]>();
    private lastItemId: number | null = null;

    constructor(private host: ElementRef<HTMLElement>, private layout: AdaptiveLayoutService, private router: Router) { }

    get c(): NarrativeEntityPlaceholderComponent { return this.controller; }

    get isCompact(): boolean { return this.layout.snapshot.isCompact; }

    get type(): string { return this.c.getListPath(); }

    get item(): any { return this.c.selectedItem; }

    get hasFicha(): boolean {
        this.syncFichaState();
        return this.c.isUpdateMode();
    }

    // ---------- La lista ----------

    get listGroups(): ListGroup[] {
        const query = foldText(this.query.value ?? '').trim();
        const matches = (item: any) => !query || foldText(item.Nombre ?? '').includes(query);
        if (this.type === 'characters')
            return this.c.getCharacterGroups()
                .map(group => ({ label: group.label, items: group.characters.filter(matches) }))
                .filter(group => group.items.length);
        if (this.c.shouldShowViewMode())
            return [{ label: 'Libro actual', items: this.c.getCurrentItems().filter(matches) }, ...this.c.getOriginGroups()
                .map(group => ({ label: group.label, items: group.items.filter(matches) }))]
                .filter(group => group.items.length);
        return [{ label: '', items: this.c.getMixedItems().filter(matches) }].filter(group => group.items.length);
    }

    /** «5 cap.» (con su estado si no es el habitual) en personajes; en el resto, lo que ya decía la lista. */
    itemMeta(item: any): string {
        if (this.type !== 'characters')
            return this.c.getItemMeta(item);
        const count = this.appearances(item.Id).length;
        const status = this.c.getCharacterStatusLabel(item);
        const chapters = count ? `${count} cap.` : '';
        return [status && status !== 'Vivo' ? status : '', chapters].filter(Boolean).join(' · ');
    }

    isSelected(item: any): boolean {
        return this.c.isUpdateMode() && Number(this.item?.Id) === Number(item.Id);
    }

    selectItem(item: any): void {
        this.c.switchToItem(item);
    }

    /** En el móvil, vuelve a la lista (guardando antes). */
    backToList(): void {
        this.c.requestCloseUpdateForm();
    }

    get newLabel(): string {
        return `${this.c.getQuickCreateTitle()}`;
    }

    // ---------- «Aparece en» (personajes) ----------

    /** Los capítulos en los que sale el personaje, en orden, y si solo se le nombra. */
    appearances(characterId: number): Appearance[] {
        if (this.appearanceSource !== this.c.book) {
            this.appearanceSource = this.c.book;
            this.appearanceCache = new Map();
            const chapters = [...(this.c.book.Capitulos ?? [])].sort((a, b) => Number(a.Orden) - Number(b.Orden));
            for (const chapter of chapters) {
                const seen = new Map<number, boolean>();
                for (const scene of chapter.Escenas ?? []) {
                    for (const entry of sceneCastDetails(scene)) {
                        const id = Number(entry.Id);
                        seen.set(id, (seen.get(id) ?? true) && !!entry.Nombrado);
                    }
                }
                for (const [id, named] of seen) {
                    const list = this.appearanceCache.get(id) ?? [];
                    list.push({ chapter, named });
                    this.appearanceCache.set(id, list);
                }
            }
        }
        return this.appearanceCache.get(Number(characterId)) ?? [];
    }

    openChapter(chapter: Chapter): void {
        void this.router.navigate(['/book', this.c.book.Id, 'chapter', chapter.Id]);
    }

    // ---------- El nombre ----------

    onNameFocusOut(event: FocusEvent, group: HTMLElement): void {
        const next = event.relatedTarget as Node | null;
        if (next && group.contains(next))
            return;
        this.c.commitName();
    }

    // ---------- Apodos ----------

    addAlias(): void {
        const value = (this.aliasDraft.value ?? '').trim();
        if (!value)
            return;
        this.c.characterAliasDraft.setValue(value);
        if (!this.c.canAddCharacterAlias())
            return;
        this.c.addCharacterAlias();
        this.aliasDraft.setValue('');
        this.c.notifyFichaEdited();
    }

    removeAlias(alias: string): void {
        this.c.removeCharacterAlias(alias);
        this.c.notifyFichaEdited();
    }

    // ---------- Entradas ----------

    isHiddenEntry(index: number): boolean {
        const entry = this.c.createEntryDrafts[index];
        return !this.revealedPlaceholder && this.c.createEntryDrafts.length === 1 && !!entry && this.c.isUnsentPlaceholderEntry(entry);
    }

    entryTitle(index: number): string {
        return String(this.c.createEntryDrafts[index]?.title.value ?? '').trim() || 'Descripción';
    }

    hasEntryText(index: number): boolean {
        const entry = this.c.createEntryDrafts[index];
        return !!entry && !this.c.isUnsentPlaceholderEntry(entry);
    }

    openEntry(index: number): void {
        this.openEntryIndex = index;
        setTimeout(() => {
            const editor = this.host.nativeElement.querySelector<HTMLElement>(`[data-entry-index="${index}"] .entry__editor .rtf-editor`);
            if (!editor)
                return;
            editor.focus({ preventScroll: true });
            // El texto por defecto queda seleccionado (el editor lo hace al enfocarlo) para escribir encima.
            const entry = this.c.createEntryDrafts[index];
            if (entry && this.c.isDefaultEntryDescription(entry))
                return;
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        });
    }

    openEntryFromText(index: number, event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.rtf-narrative-link') || window.getSelection()?.toString())
            return;
        this.openEntry(index);
    }

    /** «+ Entrada»: la de por defecto si aún no se ve (con su texto listo para escribir encima) o una nueva. */
    addEntry(): void {
        if (this.c.createEntryDrafts.length === 1 && this.isHiddenEntry(0)) {
            this.revealedPlaceholder = true;
            this.openEntry(0);
            return;
        }
        if (!this.c.addCreateEntry())
            return;
        this.openEntry(this.c.createEntryDrafts.length - 1);
        this.c.notifyFichaEdited();
    }

    removeEntry(index: number): void {
        this.c.removeCreateEntry(index);
        this.openEntryIndex = null;
        this.c.notifyFichaEdited();
    }

    // ---------- Relaciones ----------

    toggleRelationPicker(): void {
        this.relationPickerOpen = !this.relationPickerOpen;
        this.c.createCharacterRelationFilter.setValue('');
        this.c.createOrganizationRelationFilter.setValue('');
    }

    afterRelationChange(): void {
        this.c.notifyFichaEdited();
    }

    // ---------- Alta rápida ----------

    setSex(value: number): void {
        this.c.characterSex.setValue(value);
    }

    /** Al cambiar de elemento, se cierra lo que era de la ficha anterior. */
    private syncFichaState(): void {
        const id = this.c.isUpdateMode() ? Number(this.item?.Id) : null;
        if (id === this.lastItemId)
            return;
        this.lastItemId = id;
        this.openEntryIndex = null;
        this.revealedPlaceholder = false;
        this.relationPickerOpen = false;
        this.aliasDraft.setValue('', { emitEvent: false });
    }
}
