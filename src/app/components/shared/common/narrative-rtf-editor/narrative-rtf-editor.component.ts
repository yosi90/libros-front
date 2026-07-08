import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, forwardRef, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { applyNarrativeEntityLinks, NarrativeEntityLink } from '../../../../shared/narrative-entity-links';
import { htmlToRtf, rtfToHtml } from '../../../../shared/rtf/rtf-text';

type EditorCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';
interface EditorSelectionRange {
    start: number;
    end: number;
}

@Component({
    standalone: true,
    selector: 'app-narrative-rtf-editor',
    imports: [CommonModule, MatIconModule],
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
export class NarrativeRtfEditorComponent implements AfterViewInit, OnChanges, ControlValueAccessor {
    @Input() readonly = false;
    @Input() value = '';
    @Input() narrativeLinks: NarrativeEntityLink[] = [];
    @Output() narrativeLinkActivated = new EventEmitter<NarrativeEntityLink>();

    @ViewChild('editor') editor?: ElementRef<HTMLDivElement>;

    disabled = false;
    activeFormats: Record<EditorCommand, boolean> = {
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false
    };
    private currentValue = '';
    private focused = false;
    private viewReady = false;
    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.syncEditorText();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value']) {
            if (this.focused)
                return;
            this.currentValue = this.value ?? '';
            this.syncEditorText();
        }
        if (changes['narrativeLinks'] && !changes['value'])
            this.syncEditorText({ force: this.focused, preserveSelection: this.getSelectionRange() });
    }

    writeValue(value: string | null): void {
        this.currentValue = value ?? '';
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

    markFocused(): void {
        this.focused = true;
        this.refreshActiveFormats();
    }

    updateFromEditor(event: Event): void {
        const element = event.target as HTMLElement;
        const selection = this.getSelectionRange();
        this.updateValueFromHtml(element.innerHTML || '');
        this.syncEditorText({ force: true, preserveSelection: selection });
        this.refreshActiveFormats();
    }

    markTouched(): void {
        if (this.editor && !this.readonly && !this.disabled)
            this.updateValueFromHtml(this.editor.nativeElement.innerHTML || '');
        this.focused = false;
        this.onTouched();
        this.syncEditorText();
    }

    applyFormat(command: EditorCommand): void {
        if (this.readonly || this.disabled || !this.editor)
            return;

        this.editor.nativeElement.focus();
        try {
            document.execCommand(command, false);
        } catch {
            return;
        }
        this.updateValueFromHtml(this.editor.nativeElement.innerHTML || '');
        this.syncEditorText({ force: true, preserveSelection: this.getSelectionRange() });
        this.refreshActiveFormats();
    }

    refreshActiveFormats(): void {
        try {
            this.activeFormats = {
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikeThrough: document.queryCommandState('strikeThrough')
            };
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
        try {
            document.execCommand('insertText', false, text);
        } catch {
            return;
        }
        if (this.editor) {
            this.updateValueFromHtml(this.editor.nativeElement.innerHTML || '');
            this.syncEditorText({ force: true, preserveSelection: this.getSelectionRange() });
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
            if (options.preserveSelection)
                this.restoreSelectionRange(options.preserveSelection);
        }
    }

    private updateValueFromHtml(html: string): void {
        this.currentValue = htmlToRtf(html);
        this.onChange(this.currentValue);
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
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        const currentSelection = window.getSelection();
        currentSelection?.removeAllRanges();
        currentSelection?.addRange(range);
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
