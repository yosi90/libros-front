
import { AfterViewInit, Component, ElementRef, EventEmitter, forwardRef, HostListener, Input, OnChanges, OnDestroy, Optional, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { applyNarrativeEntityLinks, NarrativeEntityLink } from '../../../../shared/narrative-entity-links';
import { htmlToRtf, rtfToHtml } from '../../../../shared/rtf/rtf-text';
import {
    NARRATIVE_EDITOR_GOOGLE_FONTS,
    NARRATIVE_EDITOR_SYSTEM_FONTS,
    NarrativeEditorFontPreferenceService
} from '../../../../services/preferences/narrative-editor-font-preference.service';

type EditorCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';
type ParagraphAlignment = 'left' | 'center' | 'right' | 'justify';
type ParagraphMetric = 'li' | 'ri' | 'fi' | 'sb' | 'sa';
interface EditorSelectionRange {
    start: number;
    end: number;
}

@Component({
    standalone: true,
    selector: 'app-narrative-rtf-editor',
    imports: [MatIconModule, MatSelectModule],
    templateUrl: './narrative-rtf-editor.component.html',
    styleUrl: './narrative-rtf-editor.component.sass',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NarrativeRtfEditorComponent),
            multi: true
        }
    ]
})
export class NarrativeRtfEditorComponent implements AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor {
    @Input() readonly = false;
    @Input() value = '';
    @Input() narrativeLinks: NarrativeEntityLink[] = [];
    @Input() preferenceBookId: number | null = null;
    @Input() selectAllOnFocus = false;
    @Output() narrativeLinkActivated = new EventEmitter<NarrativeEntityLink>();
    @Output() editCommitted = new EventEmitter<void>();

    @ViewChild('editor') editor?: ElementRef<HTMLDivElement>;
    @ViewChild('toolbar') toolbar?: ElementRef<HTMLDivElement>;

    disabled = false;
    activeFormats: Record<EditorCommand, boolean> = {
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false
    };
    readonly systemFonts: string[] = [...NARRATIVE_EDITOR_SYSTEM_FONTS];
    readonly googleFonts: string[] = [...NARRATIVE_EDITOR_GOOGLE_FONTS];
    readonly fontSizes = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72, 96];
    readonly baseColors = ['#F6E6C9', '#F5DEB3', '#FFFFFF', '#D9A956', '#4F9D8D', '#5E8FC4', '#B85C5C', '#000000'];
    availableSystemFonts: string[] = [...this.systemFonts];
    availableColors = [...this.baseColors];
    selectedFont = 'Microsoft Sans Serif';
    selectedFontSize = 12;
    selectedTextColor = '#F6E6C9';
    selectedHighlightColor = '#14110D';
    activeAlignment: ParagraphAlignment = 'left';
    private currentValue = '';
    private focused = false;
    private dirtySinceFocus = false;
    private viewReady = false;
    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };
    private history: string[] = [''];
    private historyIndex = 0;
    private readonly menuPointerTolerance = 72;
    private toolbarMenuOpen = false;
    private savedSelectionRange: EditorSelectionRange | null = null;
    private keywordSyncTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(@Optional() private fontPreferences: NarrativeEditorFontPreferenceService | null = null) { }

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.restorePreferredFont();
        this.preloadGoogleFonts();
        this.syncEditorText();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value']) {
            if (this.focused)
                return;
            this.currentValue = this.value ?? '';
            this.history = [this.currentValue];
            this.historyIndex = 0;
            this.syncEditorText();
        }
        if (changes['narrativeLinks'] && !changes['value'])
            this.syncEditorText({ force: this.focused, preserveSelection: this.getSelectionRange() });
        if (changes['preferenceBookId'])
            this.restorePreferredFont();
    }

    ngOnDestroy(): void {
        if (this.keywordSyncTimer)
            clearTimeout(this.keywordSyncTimer);
    }

    writeValue(value: string | null): void {
        this.currentValue = value ?? '';
        if (!this.focused) {
            this.history = [this.currentValue];
            this.historyIndex = 0;
        }
        this.syncEditorText();
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    handleMenuToggle(event: Event): void {
        const openedMenu = event.target as HTMLDetailsElement;
        if (!openedMenu.open) {
            this.toolbarMenuOpen = this.getOpenMenus().length > 0;
            return;
        }
        this.toolbarMenuOpen = true;
        this.getOpenMenus().forEach(menu => {
            if (menu !== openedMenu)
                menu.open = false;
        });
    }

    @HostListener('document:pointerdown', ['$event'])
    handleDocumentPointerDown(event: PointerEvent): void {
        if (!this.toolbarMenuOpen)
            return;
        const target = event.target as Node | null;
        if (!target || this.getOpenMenus().some(menu => menu.contains(target)))
            return;
        this.closeToolbarMenus();
    }

    @HostListener('document:pointermove', ['$event'])
    handleDocumentPointerMove(event: PointerEvent): void {
        if (!this.toolbarMenuOpen || (event.pointerType && event.pointerType !== 'mouse'))
            return;
        this.getOpenMenus().forEach(menu => {
            const interactiveParts = [
                menu.querySelector('summary'),
                menu.querySelector('.rtf-color-menu__panel, .rtf-paragraph-menu__panel')
            ].filter((element): element is Element => !!element);
            const isNearMenu = interactiveParts.some(element =>
                this.distanceToRectangle(event.clientX, event.clientY, element.getBoundingClientRect()) <= this.menuPointerTolerance);
            if (!isNearMenu)
                menu.open = false;
        });
    }

    @HostListener('document:keydown.escape')
    closeToolbarMenus(): void {
        this.toolbarMenuOpen = false;
        this.getOpenMenus().forEach(menu => menu.open = false);
    }

    markFocused(): void {
        this.focused = true;
        this.dirtySinceFocus = false;
        this.refreshActiveFormats();
        if (this.selectAllOnFocus)
            queueMicrotask(() => this.selectAllEditorText());
    }

    updateFromEditor(event: Event): void {
        const element = event.target as HTMLElement;
        const selection = this.getSelectionRange();
        this.updateValueFromHtml(element.innerHTML || '', true);
        this.savedSelectionRange = selection;
        this.scheduleKeywordSync();
        this.refreshActiveFormats();
    }

    markTouched(): void {
        const shouldCommit = this.dirtySinceFocus;
        this.focused = false;
        this.onTouched();
        this.syncEditorText();
        if (shouldCommit)
            this.editCommitted.emit();
        this.dirtySinceFocus = false;
    }

    applyFormat(command: EditorCommand): void {
        if (this.readonly || this.disabled || !this.editor)
            return;

        this.applyCommandToEditableSelection(command);
    }

    applyFont(font: string): void {
        this.selectedFont = font;
        this.fontPreferences?.rememberFont(this.preferenceBookId, font);
        this.applyCommandToEditableSelection('fontName', font);
    }

    applyFontSize(value: string | number): void {
        const size = Math.max(6, Math.min(96, Number(value) || 12));
        this.selectedFontSize = size;
        this.applyCommandToEditableSelection('fontSize', '7', () => {
            this.editor?.nativeElement.querySelectorAll<HTMLElement>('font[size="7"]').forEach(element => {
                element.removeAttribute('size');
                element.style.fontSize = `${size}pt`;
            });
        });
    }

    applyTextColor(color: string): void {
        this.selectedTextColor = color;
        this.applyCommandToEditableSelection('foreColor', color);
    }

    applyHighlightColor(color: string): void {
        this.selectedHighlightColor = color;
        this.applyCommandToEditableSelection('hiliteColor', color, undefined, 'backColor');
    }

    applyAlignment(alignment: ParagraphAlignment): void {
        this.activeAlignment = alignment;
        this.getSelectedParagraphs().forEach(paragraph => {
            paragraph.dataset['rtfAlign'] = alignment;
            paragraph.style.textAlign = alignment;
        });
        this.commitDomMutation();
    }

    adjustIndent(deltaTwips: number): void {
        this.getSelectedParagraphs().forEach(paragraph => {
            const current = Number(paragraph.dataset['rtfLi'] ?? 0);
            const value = Math.max(0, current + deltaTwips);
            paragraph.dataset['rtfLi'] = String(value);
            paragraph.style.marginLeft = `${value / 20}pt`;
        });
        this.commitDomMutation();
    }

    applyParagraphMetric(metric: ParagraphMetric, rawValue: string | number): void {
        const points = Math.max(metric === 'fi' ? -144 : 0, Math.min(720, Number(rawValue) || 0));
        const twips = Math.round(points * 20);
        const styleProperty: Record<ParagraphMetric, keyof CSSStyleDeclaration> = {
            li: 'marginLeft', ri: 'marginRight', fi: 'textIndent', sb: 'marginTop', sa: 'marginBottom'
        };
        this.getSelectedParagraphs().forEach(paragraph => {
            paragraph.dataset[`rtf${metric.charAt(0).toUpperCase()}${metric.slice(1)}`] = String(twips);
            (paragraph.style[styleProperty[metric]] as string) = `${points}pt`;
        });
        this.commitDomMutation();
    }

    applyLineSpacing(rawValue: string | number): void {
        const multiplier = Math.max(1, Math.min(3, Number(rawValue) || 1));
        const twips = Math.round(multiplier * 240);
        this.getSelectedParagraphs().forEach(paragraph => {
            paragraph.dataset['rtfSl'] = String(twips);
            paragraph.dataset['rtfSlmult'] = '1';
            paragraph.style.lineHeight = String(multiplier);
        });
        this.commitDomMutation();
    }

    refreshActiveFormats(): void {
        this.captureEditorSelection();
        try {
            this.activeFormats = {
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikeThrough: document.queryCommandState('strikeThrough')
            };
            const selection = window.getSelection();
            const element = selection?.focusNode?.nodeType === Node.ELEMENT_NODE
                ? selection.focusNode as HTMLElement
                : selection?.focusNode?.parentElement;
            const paragraph = element?.closest('p, div') as HTMLElement | null;
            if (paragraph)
                this.activeAlignment = (paragraph.dataset['rtfAlign'] ?? paragraph.style.textAlign ?? 'left') as ParagraphAlignment;
            const styled = element?.closest('[style]') as HTMLElement | null;
            if (styled?.style.fontFamily)
                this.selectedFont = styled.style.fontFamily.replace(/["']/g, '').split(',')[0];
            if (styled?.style.fontSize)
                this.selectedFontSize = Number.parseFloat(styled.style.fontSize) || 12;
            return;
        } catch {
            // Keep the toolbar usable even when the browser has no editable selection.
        }

        this.activeFormats = {
            bold: false,
            italic: false,
            underline: false,
            strikeThrough: false
        };
    }

    handlePaste(event: ClipboardEvent): void {
        if (this.readonly || this.disabled)
            return;

        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (!text)
            return;

        event.preventDefault();
        this.replaceEditableSelection(text);
    }

    handleDrop(event: DragEvent): void {
        const target = event.target as HTMLElement | null;
        const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
        if (target?.closest('.rtf-narrative-link') || (range && this.getKeywordsIntersectingRange(range).length)) {
            event.preventDefault();
            const text = event.dataTransfer?.getData('text/plain') ?? '';
            if (text && range)
                this.replaceEditableSelection(text);
        }
    }

    handleBeforeInput(event: InputEvent): void {
        if (this.readonly || this.disabled)
            return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0)
            return;
        const range = selection.getRangeAt(0);
        const inputType = event.inputType ?? '';
        if (inputType === 'historyUndo' || inputType === 'historyRedo') {
            event.preventDefault();
            this.applyHistory(inputType === 'historyUndo' ? -1 : 1);
            return;
        }
        const keywords = this.getKeywordsIntersectingRange(range);

        if (range.collapsed && inputType.startsWith('insert') && event.data && this.isInsideKeyword(range)) {
            if (this.isKeywordTrailingText(event.data)) {
                event.preventDefault();
                this.insertAfterKeyword(range, event.data);
            }
            return;
        }

        if (range.collapsed && ['deleteContentBackward', 'deleteContentForward'].includes(inputType)) {
            const keyword = this.getAdjacentKeyword(range, inputType === 'deleteContentBackward');
            if (keyword) {
                event.preventDefault();
                this.removeKeywordAtom(keyword);
            }
            return;
        }

        if (!range.collapsed && keywords.length && (inputType.startsWith('delete') || inputType.startsWith('insert'))) {
            event.preventDefault();
            const insertedText = inputType.startsWith('insert') ? event.data ?? '' : '';
            this.replaceEditableSelection(insertedText, this.selectionContainsOnlyKeywords(range));
        }
    }

    handleKeydown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement | null;
        const keyword = target?.closest?.('.rtf-narrative-link') as HTMLElement | null;
        if (keyword && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            const link = this.findLinkFromElement(keyword);
            if (link)
                this.narrativeLinkActivated.emit(link);
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'z') {
            event.preventDefault();
            this.applyHistory(event.shiftKey ? 1 : -1);
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'y') {
            event.preventDefault();
            this.applyHistory(1);
            return;
        }

        if (!['Backspace', 'Delete'].includes(event.key) || this.readonly || this.disabled)
            return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !selection.getRangeAt(0).collapsed)
            return;
        const adjacent = this.getAdjacentKeyword(selection.getRangeAt(0), event.key === 'Backspace');
        if (adjacent) {
            event.preventDefault();
            this.removeKeywordAtom(adjacent);
        }
    }

    handleEditorClick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        const linkElement = target?.closest?.('.rtf-narrative-link') as HTMLElement | null;
        if (!linkElement)
            return;

        const link = this.findLinkFromElement(linkElement);
        if (!link)
            return;

        event.preventDefault();
        event.stopPropagation();
        this.narrativeLinkActivated.emit(link);
    }

    private syncEditorText(options: { force?: boolean; preserveSelection?: EditorSelectionRange | null } = {}): void {
        if (!this.viewReady || !this.editor || (this.focused && !options.force))
            return;

        const html = applyNarrativeEntityLinks(rtfToHtml(this.currentValue), this.narrativeLinks);
        if (this.editor.nativeElement.innerHTML !== html) {
            this.editor.nativeElement.innerHTML = html;
            this.refreshAvailableFonts();
            if (options.preserveSelection)
                this.restoreSelectionRange(options.preserveSelection);
        }
    }

    private updateValueFromHtml(html: string, markDirty = false): void {
        const nextValue = htmlToRtf(html);
        if (nextValue === this.currentValue)
            return;
        if (markDirty) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            if (this.history[this.historyIndex] !== this.currentValue)
                this.history.push(this.currentValue);
            this.history.push(nextValue);
            this.historyIndex = this.history.length - 1;
        }
        this.currentValue = nextValue;
        if (markDirty)
            this.dirtySinceFocus = true;
        this.onChange(this.currentValue);
    }

    private applyCommandToEditableSelection(command: string, value?: string, afterCommand?: () => void, fallbackCommand?: string): void {
        if (this.readonly || this.disabled || !this.editor)
            return;
        this.editor.nativeElement.focus();
        this.restoreSavedSelection();
        const selectionSnapshot = this.getSelectionRange() ?? this.savedSelectionRange;
        const ranges = this.getEditableSelectionRanges();
        if (!ranges.length)
            return;

        try {
            ranges.reverse().forEach(range => {
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                const applied = document.execCommand(command, false, value);
                if (!applied && fallbackCommand)
                    document.execCommand(fallbackCommand, false, value);
                afterCommand?.();
            });
        } catch {
            return;
        }
        this.updateValueFromHtml(this.editor.nativeElement.innerHTML || '', true);
        this.syncEditorText({ force: true, preserveSelection: selectionSnapshot });
        this.refreshActiveFormats();
    }

    private getEditableSelectionRanges(): Range[] {
        if (!this.editor)
            return [];
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0)
            return [];
        const selected = selection.getRangeAt(0);
        const root = this.editor.nativeElement;
        if (!root.contains(selected.startContainer) || !root.contains(selected.endContainer))
            return [];
        if (selected.collapsed) {
            const parent = selected.startContainer.nodeType === Node.ELEMENT_NODE
                ? selected.startContainer as HTMLElement
                : selected.startContainer.parentElement;
            return parent?.closest('.rtf-narrative-link') ? [] : [selected.cloneRange()];
        }

        const ranges: Range[] = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: node => (node.parentElement?.closest('.rtf-narrative-link'))
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT
        });
        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            if (!selected.intersectsNode(node))
                continue;
            const range = document.createRange();
            const start = node === selected.startContainer ? selected.startOffset : 0;
            const end = node === selected.endContainer ? selected.endOffset : node.data.length;
            if (end <= start)
                continue;
            range.setStart(node, start);
            range.setEnd(node, end);
            ranges.push(range);
        }
        return ranges;
    }

    private getSelectedParagraphs(): HTMLElement[] {
        if (!this.editor)
            return [];
        this.editor.nativeElement.focus();
        this.restoreSavedSelection();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0)
            return [];
        const range = selection.getRangeAt(0);
        return Array.from(this.editor.nativeElement.querySelectorAll<HTMLElement>('p, div'))
            .filter(element => !element.closest('.rtf-narrative-link') && range.intersectsNode(element));
    }

    private commitDomMutation(selection = this.getSelectionRange()): void {
        if (!this.editor)
            return;
        this.updateValueFromHtml(this.editor.nativeElement.innerHTML || '', true);
        this.savedSelectionRange = selection;
        this.syncEditorText({ force: true, preserveSelection: selection });
        this.refreshActiveFormats();
    }

    private getKeywordsIntersectingRange(range: Range): HTMLElement[] {
        if (!this.editor)
            return [];
        return Array.from(this.editor.nativeElement.querySelectorAll<HTMLElement>('.rtf-narrative-link'))
            .filter(element => {
                try {
                    return range.intersectsNode(element);
                } catch {
                    return false;
                }
            });
    }

    private selectionContainsOnlyKeywords(range: Range): boolean {
        const fragment = range.cloneContents();
        fragment.querySelectorAll?.('.rtf-narrative-link').forEach(element => element.remove());
        return !(fragment.textContent ?? '').replace(/\u00a0/g, ' ').trim();
    }

    private replaceEditableSelection(text: string, removeSelectedKeywords = false): void {
        if (!this.editor)
            return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0)
            return;
        const original = selection.getRangeAt(0).cloneRange();
        const marker = document.createElement('span');
        marker.dataset['editorCaret'] = 'true';
        marker.textContent = '\u200B';
        const markerRange = original.cloneRange();
        markerRange.collapse(true);
        markerRange.insertNode(marker);

        const keywords = this.getKeywordsIntersectingRange(original);
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(this.editor.nativeElement, NodeFilter.SHOW_TEXT, {
            acceptNode: node => node.parentElement?.closest('.rtf-narrative-link') || node.parentElement === marker
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT
        });
        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            if (original.intersectsNode(node))
                textNodes.push(node);
        }
        textNodes.reverse().forEach(node => {
            const start = node === original.startContainer ? original.startOffset : 0;
            const end = node === original.endContainer ? original.endOffset : node.data.length;
            if (end > start)
                node.deleteData(start, end - start);
        });
        if (removeSelectedKeywords)
            keywords.forEach(keyword => keyword.remove());

        const inserted = text ? document.createTextNode(text) : null;
        if (inserted)
            marker.before(inserted);
        const caret = document.createRange();
        if (inserted) caret.setStartAfter(inserted);
        else caret.setStartBefore(marker);
        caret.collapse(true);
        marker.remove();
        selection.removeAllRanges();
        selection.addRange(caret);
        this.editor.nativeElement.normalize();
        this.commitDomMutation(this.getSelectionRange());
    }

    private getAdjacentKeyword(range: Range, backward: boolean): HTMLElement | null {
        if (!this.editor || !range.collapsed)
            return null;
        const leaves = this.collectEditorLeaves(this.editor.nativeElement);
        const container = range.startContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            const text = container.textContent ?? '';
            if ((backward && range.startOffset > 0) || (!backward && range.startOffset < text.length))
                return null;
            const index = leaves.indexOf(container);
            const adjacent = leaves[index + (backward ? -1 : 1)];
            return adjacent instanceof HTMLElement && adjacent.classList.contains('rtf-narrative-link') ? adjacent : null;
        }
        const element = container as Element;
        const child = element.childNodes[range.startOffset + (backward ? -1 : 0)];
        const leaf = child ? this.edgeLeaf(child, !backward) : null;
        if (leaf instanceof HTMLElement && leaf.classList.contains('rtf-narrative-link'))
            return leaf;
        const anchorIndex = leaves.findIndex(item => item.parentNode === container);
        const adjacent = leaves[anchorIndex + (backward ? -1 : 0)];
        return adjacent instanceof HTMLElement && adjacent.classList.contains('rtf-narrative-link') ? adjacent : null;
    }

    private collectEditorLeaves(node: Node): Node[] {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('rtf-narrative-link'))
            return [node];
        if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toLowerCase() === 'br'))
            return [node];
        return Array.from(node.childNodes).flatMap(child => this.collectEditorLeaves(child));
    }

    private edgeLeaf(node: Node, first: boolean): Node | null {
        const leaves = this.collectEditorLeaves(node);
        return first ? leaves[0] ?? null : leaves[leaves.length - 1] ?? null;
    }

    private removeKeywordAtom(keyword: HTMLElement): void {
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStartBefore(keyword);
        caret.collapse(true);
        keyword.remove();
        selection?.removeAllRanges();
        selection?.addRange(caret);
        this.commitDomMutation(this.getSelectionRange());
    }

    private scheduleKeywordSync(): void {
        if (this.keywordSyncTimer)
            clearTimeout(this.keywordSyncTimer);
        this.keywordSyncTimer = setTimeout(() => {
            this.keywordSyncTimer = null;
            const selection = this.getSelectionRange() ?? this.savedSelectionRange;
            this.syncEditorText({ force: true, preserveSelection: selection });
            this.savedSelectionRange = selection;
        }, 250);
    }

    private isInsideKeyword(range: Range): boolean {
        const container = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer as HTMLElement
            : range.startContainer.parentElement;
        return !!container?.closest('.rtf-narrative-link');
    }

    private isKeywordTrailingText(value: string): boolean {
        return /^[\s.,;:!?¡¿…()[\]{}'"«»\-–—]+$/u.test(value);
    }

    private insertAfterKeyword(range: Range, value: string): void {
        const container = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer as HTMLElement
            : range.startContainer.parentElement;
        const keyword = container?.closest('.rtf-narrative-link') as HTMLElement | null;
        if (!keyword || !this.editor)
            return;
        const text = document.createTextNode(value);
        keyword.after(text);
        const caret = document.createRange();
        caret.setStartAfter(text);
        caret.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(caret);
        this.commitDomMutation(this.getSelectionRange());
    }

    private selectAllEditorText(): void {
        if (!this.editor || !this.selectAllOnFocus)
            return;
        const range = document.createRange();
        range.selectNodeContents(this.editor.nativeElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        this.captureEditorSelection();
    }

    private captureEditorSelection(): void {
        const selection = this.getSelectionRange();
        if (selection)
            this.savedSelectionRange = selection;
    }

    private restoreSavedSelection(): void {
        if (this.savedSelectionRange)
            this.restoreSelectionRange(this.savedSelectionRange);
    }

    private refreshAvailableFonts(): void {
        if (!this.editor)
            return;
        const documentFonts = Array.from(this.editor.nativeElement.querySelectorAll<HTMLElement>('[style*="font-family"]'))
            .map(element => element.style.fontFamily.replace(/["']/g, '').split(',')[0].trim())
            .filter(Boolean);
        const googleFonts = new Set<string>(this.googleFonts);
        this.availableSystemFonts = [...new Set([...documentFonts.filter(font => !googleFonts.has(font)), ...this.systemFonts])]
            .sort((left, right) => left.localeCompare(right, 'es'));
        const documentColors = Array.from(this.editor.nativeElement.querySelectorAll<HTMLElement>('[style*="color"]'))
            .flatMap(element => [element.style.color, element.style.backgroundColor])
            .map(color => this.cssColorToHex(color))
            .filter((color): color is string => !!color);
        this.availableColors = [...new Set([...documentColors, ...this.baseColors])];
    }

    private restorePreferredFont(): void {
        if (!this.readonly)
            this.selectedFont = this.fontPreferences?.preferredFont(this.preferenceBookId) ?? this.selectedFont;
    }

    private preloadGoogleFonts(): void {
        if (!document.fonts)
            return;
        this.googleFonts.forEach(font => {
            void document.fonts.load(`16px "${font}"`).catch(() => void 0);
        });
    }

    private getOpenMenus(): HTMLDetailsElement[] {
        return this.toolbar
            ? Array.from(this.toolbar.nativeElement.querySelectorAll<HTMLDetailsElement>('details[open]'))
            : [];
    }

    private distanceToRectangle(x: number, y: number, rectangle: DOMRect): number {
        const horizontalDistance = Math.max(rectangle.left - x, 0, x - rectangle.right);
        const verticalDistance = Math.max(rectangle.top - y, 0, y - rectangle.bottom);
        return Math.hypot(horizontalDistance, verticalDistance);
    }

    private applyHistory(delta: number): void {
        const nextIndex = Math.max(0, Math.min(this.history.length - 1, this.historyIndex + delta));
        if (nextIndex === this.historyIndex)
            return;
        this.historyIndex = nextIndex;
        this.currentValue = this.history[this.historyIndex];
        this.dirtySinceFocus = true;
        this.onChange(this.currentValue);
        this.syncEditorText({ force: true });
        this.moveCaretToEnd();
    }

    private moveCaretToEnd(): void {
        if (!this.editor)
            return;
        const range = document.createRange();
        range.selectNodeContents(this.editor.nativeElement);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    private cssColorToHex(value: string): string | null {
        if (!value)
            return null;
        if (/^#[0-9a-f]{6}$/i.test(value))
            return value.toUpperCase();
        const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (!rgb)
            return null;
        return `#${[rgb[1], rgb[2], rgb[3]].map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    }

    private findLinkFromElement(element: HTMLElement): NarrativeEntityLink | null {
        const entityId = Number(element.dataset['entityId']);
        const entityKind = element.dataset['entityKind'];
        const targetUrl = element.dataset['targetUrl'];
        return this.narrativeLinks.find(link => link.id === entityId && link.kind === entityKind && link.targetUrl === targetUrl) ?? null;
    }

    private getSelectionRange(): EditorSelectionRange | null {
        if (!this.editor)
            return null;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0)
            return null;

        const range = selection.getRangeAt(0);
        const root = this.editor.nativeElement;
        if (!root.contains(range.startContainer) || !root.contains(range.endContainer))
            return null;

        return {
            start: this.getTextOffset(root, range.startContainer, range.startOffset),
            end: this.getTextOffset(root, range.endContainer, range.endOffset)
        };
    }

    private restoreSelectionRange(selection: EditorSelectionRange): void {
        if (!this.editor)
            return;

        const root = this.editor.nativeElement;
        const start = this.findPositionAtOffset(root, selection.start);
        const end = this.findPositionAtOffset(root, selection.end);
        if (!start || !end)
            return;

        const range = document.createRange();
        this.setRangeBoundary(range, 'start', start.node, start.offset, selection.start === selection.end);
        this.setRangeBoundary(range, 'end', end.node, end.offset, selection.start === selection.end);
        const currentSelection = window.getSelection();
        currentSelection?.removeAllRanges();
        currentSelection?.addRange(range);
    }

    private setRangeBoundary(range: Range, boundary: 'start' | 'end', node: Node, offset: number, collapsed: boolean): void {
        const keyword = node.nodeType === Node.TEXT_NODE
            ? node.parentElement?.closest('.rtf-narrative-link') as HTMLElement | null
            : null;
        if (collapsed && keyword) {
            const atEnd = offset >= (node.textContent?.length ?? 0);
            if (boundary === 'start')
                atEnd ? range.setStartAfter(keyword) : range.setStartBefore(keyword);
            else
                atEnd ? range.setEndAfter(keyword) : range.setEndBefore(keyword);
            return;
        }
        boundary === 'start' ? range.setStart(node, offset) : range.setEnd(node, offset);
    }

    private getTextOffset(root: Node, target: Node, targetOffset: number): number {
        if (target.nodeType !== Node.TEXT_NODE)
            return this.getElementTextOffset(root, target, targetOffset);

        let offset = 0;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node === target)
                return offset + targetOffset;
            offset += node.textContent?.length ?? 0;
        }
        return offset;
    }

    private getElementTextOffset(root: Node, target: Node, targetOffset: number): number {
        if (target === root) {
            return Array.from(root.childNodes)
                .slice(0, targetOffset)
                .reduce((total, child) => total + (child.textContent?.length ?? 0), 0);
        }

        let offset = 0;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node === target) {
                return offset + Array.from(target.childNodes)
                    .slice(0, targetOffset)
                    .reduce((total, child) => total + (child.textContent?.length ?? 0), 0);
            }
            if (node.nodeType === Node.TEXT_NODE)
                offset += node.textContent?.length ?? 0;
        }
        return offset;
    }

    private findPositionAtOffset(root: Node, targetOffset: number): { node: Node; offset: number } | null {
        let offset = 0;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const length = node.textContent?.length ?? 0;
            if (offset + length >= targetOffset)
                return { node, offset: Math.max(0, targetOffset - offset) };
            offset += length;
        }
        return { node: root, offset: root.childNodes.length };
    }
}
