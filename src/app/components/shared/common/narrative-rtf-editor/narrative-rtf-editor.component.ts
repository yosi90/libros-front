import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, forwardRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { plainTextToRtf, rtfToPlainText } from '../../../../shared/rtf/rtf-text';

@Component({
    standalone: true,
    selector: 'app-narrative-rtf-editor',
    imports: [CommonModule],
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
    private currentValue = '';
    private viewReady = false;
    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    ngAfterViewInit(): void {
        this.viewReady = true;
        this.syncEditorText();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value']) {
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

    updateFromEditor(event: Event): void {
        const element = event.target as HTMLElement;
        this.currentValue = plainTextToRtf(element.innerText || '');
        this.onChange(this.currentValue);
    }

    markTouched(): void {
        this.onTouched();
    }

    private syncEditorText(): void {
        if (!this.viewReady || !this.editor)
            return;

        const text = rtfToPlainText(this.currentValue);
        if (this.editor.nativeElement.innerText !== text)
            this.editor.nativeElement.innerText = text;
    }
}
