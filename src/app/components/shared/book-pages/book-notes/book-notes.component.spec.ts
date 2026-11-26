import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { BookNotesComponent } from './book-notes.component';
import { NoteService } from '../../../../services/entities/note.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PendingWorkService } from '../../../../services/auth/pending-work.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('BookNotesComponent', () => {
    let component: BookNotesComponent;
    let notes: jasmine.SpyObj<NoteService>;
    let snackBar: jasmine.SpyObj<SnackbarModule>;

    beforeEach(() => {
        notes = jasmine.createSpyObj<NoteService>('NoteService', ['getByBook', 'create', 'update', 'delete']);
        notes.getByBook.and.returnValue(of([
            { Id: 1, Nombre: 'Antigua', Descripcion: '{\\rtf1\\ansi Texto antiguo en RTF}', Fecha: '2026-01-01T00:00:00Z', LibroId: 7 },
            { Id: 2, Nombre: 'Reciente', Descripcion: 'Una teoría bastante larga', Fecha: '2026-09-01T00:00:00Z', LibroId: 7 }
        ]));
        snackBar = jasmine.createSpyObj<SnackbarModule>('SnackbarModule', ['openSnackBar', 'openApiError']);

        TestBed.configureTestingModule({
            providers: [
                { provide: NoteService, useValue: notes },
                { provide: BookStoreService, useValue: { book$: new BehaviorSubject({ Id: 7 }) } },
                { provide: PresentationModeService, useValue: { snapshot: { isMobilePresentationActive: false, activeMode: 'web' } } },
                { provide: SnackbarModule, useValue: snackBar }
            ]
        });
        TestBed.overrideComponent(BookNotesComponent, { set: { imports: [], template: '' } });
        component = TestBed.createComponent(BookNotesComponent).componentInstance;
        component.ngOnInit();
    });

    it('loads the book notes newest first and shows old RTF notes as text', () => {
        expect(notes.getByBook).toHaveBeenCalledWith(7);
        expect(component.visibleNotes.map(note => note.Nombre)).toEqual(['Reciente', 'Antigua']);
        expect(component.noteText(component.notes[0])).not.toContain('rtf1');
    });

    it('filters notes by title or text', () => {
        component.query.setValue('teoría');

        expect(component.visibleNotes.map(note => note.Id)).toEqual([2]);
    });

    it('creates a note for the current book', () => {
        notes.create.and.returnValue(of({ Id: 9, Nombre: 'Nueva', Descripcion: 'Quince caracteres o más', Fecha: '2026-09-26T00:00:00Z', LibroId: 7 }));
        component.startCreate();
        component.form.setValue({ name: ' Nueva ', description: 'Quince caracteres o más' });

        component.save();

        expect(notes.create).toHaveBeenCalledWith({ Nombre: 'Nueva', Descripcion: 'Quince caracteres o más', LibroId: 7 });
        expect(component.notes[0].Id).toBe(9);
        expect(component.formOpen).toBeFalse();
    });

    it('does not save a note that is too short', () => {
        component.startCreate();
        component.form.setValue({ name: 'Ok', description: 'corta' });

        component.save();

        expect(notes.create).not.toHaveBeenCalled();
    });

    it('updates an existing note without sending its server-owned date', () => {
        notes.update.and.callFake(payload => of({ Fecha: '2026-09-01T00:00:00Z', Nombre: '', Descripcion: '', LibroId: 7, ...payload }));
        component.startEdit(component.notes[1]);
        component.form.controls.name.setValue('Reciente editada');

        component.save();

        expect(notes.update).toHaveBeenCalledWith({ Id: 2, Nombre: 'Reciente editada', Descripcion: 'Una teoría bastante larga', LibroId: 7 });
        expect(component.notes.find(note => note.Id === 2)?.Nombre).toBe('Reciente editada');
    });

    it('asks before deleting and keeps the note when the API fails', () => {
        notes.delete.and.returnValue(throwError(() => ({ error: { error: 'No puedes borrar esta nota.' } })));
        component.requestDelete(component.notes[0]);
        expect(component.confirmDeleteId).toBe(1);

        component.confirmDelete();

        expect(component.notes.length).toBe(2);
        expect(snackBar.openApiError).toHaveBeenCalledWith(jasmine.anything(), 'No se pudo eliminar la nota.');
    });

    describe('Web: el compositor se guarda solo («Cuaderno», F4)', () => {
        let pendingWork: PendingWorkService;

        beforeEach(() => {
            pendingWork = TestBed.inject(PendingWorkService);
            pendingWork.setScope('pruebas:ana');
        });

        afterEach(() => {
            pendingWork.take('pruebas:ana', 'nota:7:nueva');
            pendingWork.setScope(null);
        });

        it('crea la nota al cumplir lo mínimo y después la actualiza', () => {
            notes.create.and.returnValue(of({ Id: 9, Nombre: 'El faro', Descripcion: 'Si el faro se apagó la noche', Fecha: '2026-11-26', LibroId: 7 }));
            notes.update.and.returnValue(of({ Id: 9, Nombre: 'El faro', Descripcion: 'Si el faro se apagó la noche en que desapareció', Fecha: '2026-11-26', LibroId: 7 }));

            component.form.setValue({ name: 'El faro', description: 'Si el faro se apagó la noche' });
            component.autosaveComposer();
            expect(notes.create).toHaveBeenCalledOnceWith({ Nombre: 'El faro', Descripcion: 'Si el faro se apagó la noche', LibroId: 7 });
            expect(component.editingId).toBe(9);
            expect(component.composerStatus).toBe('saved');
            expect(component.listedNotes.map(note => note.Id)).withContext('la del compositor no se repite').not.toContain(9);

            component.form.controls.description.setValue('Si el faro se apagó la noche en que desapareció');
            component.autosaveComposer();
            expect(notes.update).toHaveBeenCalledOnceWith(jasmine.objectContaining({ Id: 9 }));
            expect(notes.create).toHaveBeenCalledTimes(1);
        });

        it('lo que aún no cumple se queda en el dispositivo y vuelve al abrir las notas', () => {
            component.form.setValue({ name: 'E', description: 'corto' });
            component.autosaveComposer();

            expect(notes.create).not.toHaveBeenCalled();
            expect(component.composerStatus).toBe('invalid');
            expect(component.composerStatusLabel).toBe('Sin guardar: falta el título (2 caracteres) y el texto (15 caracteres)');

            const reopened = TestBed.createComponent(BookNotesComponent).componentInstance;
            reopened.ngOnInit();
            expect(reopened.form.getRawValue()).toEqual({ name: 'E', description: 'corto' });
            expect(reopened.editingId).toBeNull();
        });

        it('sin red, dice que lo escrito está en el dispositivo', () => {
            notes.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

            component.form.setValue({ name: 'El faro', description: 'Si el faro se apagó la noche' });
            component.autosaveComposer();

            expect(component.composerStatus).toBe('offline');
            expect(component.composerStatusLabel).toBe('Sin conexión · guardado en el dispositivo');
            expect(snackBar.openApiError).not.toHaveBeenCalled();
            expect(pendingWork.take('pruebas:ana', 'nota:7:nueva')?.borrador).toEqual(jasmine.objectContaining({ name: 'El faro' }));
        });
    });
});
