import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, forwardRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { htmlToRtf, rtfToHtml } from '../../../../shared/rtf/rtf-text';

type EditorCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';

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
        this.updateValueFromHtml(element.innerHTML || '');
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
        if (this.editor)
            this.updateValueFromHtml(this.editor.nativeElement.innerHTML || '');
    }

    private syncEditorText(): void {
        if (!this.viewReady || !this.editor || this.focused)
            return;

        const html = rtfToHtml(this.currentValue);
        if (this.editor.nativeElement.innerHTML !== html)
            this.editor.nativeElement.innerHTML = html;
    }

    private updateValueFromHtml(html: string): void {
        this.currentValue = htmlToRtf(html);
        this.onChange(this.currentValue);
    }
}
