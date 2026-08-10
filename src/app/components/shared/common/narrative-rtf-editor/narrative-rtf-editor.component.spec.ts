import { ElementRef } from '@angular/core';
import { rtfToPlainText, plainTextToRtf } from '../../../../shared/rtf/rtf-text';
import { NarrativeEntityLink } from '../../../../shared/narrative-entity-links';
import { NarrativeEditorFontPreferenceService } from '../../../../services/preferences/narrative-editor-font-preference.service';
import { NarrativeRtfEditorComponent } from './narrative-rtf-editor.component';

describe('NarrativeRtfEditorComponent', () => {
    const link: NarrativeEntityLink = {
        id: 1,
        kind: 'characters',
        text: 'Citra',
        targetUrl: '/book/7/characters?selected=1',
        title: 'Abrir Citra',
        priority: 0
    };

    function createEditor(value = 'Citra vino'): { component: NarrativeRtfEditorComponent; root: HTMLDivElement } {
        const component = new NarrativeRtfEditorComponent();
        const root = document.createElement('div');
        document.body.appendChild(root);
        component.narrativeLinks = [link];
        component.writeValue(plainTextToRtf(value));
        component.editor = new ElementRef(root);
        component.ngAfterViewInit();
        return { component, root };
    }

    afterEach(() => {
        document.body.innerHTML = '';
        window.getSelection()?.removeAllRanges();
    });

    it('renders narrative keywords as protected spellcheck-free tokens', () => {
        const { root } = createEditor();
        const keyword = root.querySelector<HTMLElement>('.rtf-narrative-link');

        expect(keyword).not.toBeNull();
        expect(keyword?.contentEditable).toBe('false');
        expect(keyword?.spellcheck).toBeFalse();
        expect(keyword?.getAttribute('autocorrect')).toBe('off');
        expect(keyword?.draggable).toBeFalse();
    });

    it('does not emit a change or commit after focus and blur without an edit', () => {
        const { component } = createEditor();
        const onChange = jasmine.createSpy('onChange');
        const committed = jasmine.createSpy('committed');
        component.registerOnChange(onChange);
        component.editCommitted.subscribe(committed);

        component.markFocused();
        component.markTouched();

        expect(onChange).not.toHaveBeenCalled();
        expect(committed).not.toHaveBeenCalled();
    });

    it('removes a keyword atomically with Backspace at its trailing edge', () => {
        const { component, root } = createEditor();
        const onChange = jasmine.createSpy('onChange');
        component.registerOnChange(onChange);
        const keyword = root.querySelector<HTMLElement>('.rtf-narrative-link') as HTMLElement;
        const range = document.createRange();
        range.setStartAfter(keyword);
        range.collapse(true);
        const selection = window.getSelection() as Selection;
        selection.removeAllRanges();
        selection.addRange(range);
        const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });

        component.handleKeydown(event);

        expect(event.defaultPrevented).toBeTrue();
        expect(root.querySelector('.rtf-narrative-link')).toBeNull();
        expect(onChange).toHaveBeenCalled();
        expect(rtfToPlainText(onChange.calls.mostRecent().args[0])).toBe('vino');
    });

    it('emits a commit after a real editor mutation', () => {
        const { component, root } = createEditor('Texto normal');
        const onChange = jasmine.createSpy('onChange');
        const committed = jasmine.createSpy('committed');
        component.registerOnChange(onChange);
        component.editCommitted.subscribe(committed);
        component.markFocused();
        root.querySelector('p')?.append(document.createTextNode(' editado'));

        component.updateFromEditor({ target: root } as unknown as Event);
        component.markTouched();

        expect(onChange).toHaveBeenCalled();
        expect(committed).toHaveBeenCalledTimes(1);
    });

    it('remembers a selected font for the current account and book', () => {
        const preferences = jasmine.createSpyObj<NarrativeEditorFontPreferenceService>('fontPreferences', ['preferredFont', 'rememberFont']);
        const component = new NarrativeRtfEditorComponent(preferences);
        component.preferenceBookId = 42;

        component.applyFont('Lato');

        expect(preferences.rememberFont).toHaveBeenCalledOnceWith(42, 'Lato');
    });

    it('keeps only one toolbar menu open and closes it after an outside press', () => {
        const component = new NarrativeRtfEditorComponent();
        const toolbar = document.createElement('div');
        const first = document.createElement('details');
        const second = document.createElement('details');
        toolbar.append(first, second);
        document.body.append(toolbar);
        component.toolbar = new ElementRef(toolbar);
        first.open = true;
        second.open = true;

        component.handleMenuToggle({ target: second } as unknown as Event);

        expect(first.open).toBeFalse();
        expect(second.open).toBeTrue();

        const outside = document.createElement('button');
        document.body.append(outside);
        component.handleDocumentPointerDown({ target: outside } as unknown as PointerEvent);

        expect(second.open).toBeFalse();
    });

    it('closes an open toolbar menu when the pointer moves far away', () => {
        const component = new NarrativeRtfEditorComponent();
        const toolbar = document.createElement('div');
        const menu = document.createElement('details');
        const summary = document.createElement('summary');
        const panel = document.createElement('div');
        panel.className = 'rtf-color-menu__panel';
        menu.append(summary, panel);
        toolbar.append(menu);
        document.body.append(toolbar);
        component.toolbar = new ElementRef(toolbar);
        menu.open = true;
        spyOn(summary, 'getBoundingClientRect').and.returnValue(new DOMRect(100, 100, 28, 28));
        spyOn(panel, 'getBoundingClientRect').and.returnValue(new DOMRect(100, 134, 120, 100));
        component.handleMenuToggle({ target: menu } as unknown as Event);

        component.handleDocumentPointerMove({ clientX: 400, clientY: 400, pointerType: 'mouse' } as PointerEvent);

        expect(menu.open).toBeFalse();
    });
});
