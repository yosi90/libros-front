import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { BookNote } from '../../../../interfaces/note';
import { NoteService } from '../../../../services/entities/note.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { rtfToPlainText } from '../../../../shared/rtf/rtf-text';
import { WebBookNotesViewComponent } from '../../../web/book/web-book-notes-view/web-book-notes-view.component';
import { MobileBookNotesViewComponent } from '../../../mobile/book/mobile-book-notes-view/mobile-book-notes-view.component';

/**
 * Notas personales de lectura del libro (`/notas`). El contenedor es dueño del
 * estado; Web y Mobile tienen vista propia y Wood usa la plantilla de aquí.
 */
@Component({
    standalone: true,
    selector: 'app-book-notes',
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, SnackbarModule, WebBookNotesViewComponent, MobileBookNotesViewComponent],
    templateUrl: './book-notes.component.html',
    styleUrl: './book-notes.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class BookNotesComponent implements OnInit, OnDestroy {
    bookId = 0;
    notes: BookNote[] = [];
    loading = false;
    loadError = '';
    saving = false;
    editingId: number | null = null;
    /** Nota pendiente de confirmar su borrado. */
    confirmDeleteId: number | null = null;
    deleting = false;
    formOpen = false;
    readonly query = new FormControl('', { nonNullable: true });
    readonly form = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)] }),
        description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(15)] })
    });
    private destroy$ = new Subject<void>();

    constructor(
        private noteSrv: NoteService,
        private bookStore: BookStoreService,
        private presentation: PresentationModeService,
        private snackBar: SnackbarModule,
        private changeDetector: ChangeDetectorRef
    ) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    get controller(): this { return this; }

    get visibleNotes(): BookNote[] {
        const query = this.query.value.trim().toLocaleLowerCase('es');
        const notes = [...this.notes].sort((a, b) => (b.Fecha ?? '').localeCompare(a.Fecha ?? '') || b.Id - a.Id);
        if (!query)
            return notes;
        return notes.filter(note => `${note.Nombre} ${this.noteText(note)}`.toLocaleLowerCase('es').includes(query));
    }

    get isEditing(): boolean { return this.editingId !== null; }

    ngOnInit(): void {
        this.bookStore.book$.pipe(
            map(book => book.Id),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(bookId => {
            this.bookId = bookId;
            if (bookId) this.loadNotes();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /** Las notas antiguas pueden venir en RTF; se muestran como texto. */
    noteText(note: BookNote): string {
        const value = note.Descripcion ?? '';
        return value.trimStart().startsWith('{\\rtf') ? rtfToPlainText(value) : value;
    }

    loadNotes(): void {
        this.loading = true;
        this.loadError = '';
        this.noteSrv.getByBook(this.bookId).subscribe({
            next: notes => {
                this.notes = notes ?? [];
                this.loading = false;
                this.changeDetector.markForCheck();
            },
            error: error => {
                this.loading = false;
                this.loadError = getApiErrorMessage(error, 'No se pudieron cargar las notas del libro.');
                this.changeDetector.markForCheck();
            }
        });
    }

    startCreate(): void {
        this.editingId = null;
        this.form.reset({ name: '', description: '' });
        this.formOpen = true;
    }

    startEdit(note: BookNote): void {
        this.editingId = note.Id;
        this.form.reset({ name: note.Nombre, description: this.noteText(note) });
        this.formOpen = true;
    }

    cancelForm(): void {
        this.formOpen = false;
        this.editingId = null;
        this.form.reset({ name: '', description: '' });
    }

    save(): void {
        if (this.form.invalid || this.saving) {
            this.form.markAllAsTouched();
            return;
        }
        const payload = {
            Nombre: this.form.controls.name.value.trim(),
            Descripcion: this.form.controls.description.value.trim(),
            LibroId: this.bookId
        };
        const editingId = this.editingId;
        // Fecha la fija el servidor al crear y no cambia al editar.
        const request = editingId === null
            ? this.noteSrv.create(payload)
            : this.noteSrv.update({ ...payload, Id: editingId });
        this.saving = true;
        request.subscribe({
            next: saved => {
                const previous = this.notes.find(item => item.Id === editingId);
                // POST y PATCH devuelven la nota completa; sin ella se conserva lo enviado.
                const note: BookNote = saved?.Id ? saved : { ...payload, Id: editingId ?? 0, Fecha: previous?.Fecha ?? '' };
                this.notes = editingId === null ? [note, ...this.notes] : this.notes.map(item => item.Id === editingId ? note : item);
                this.saving = false;
                this.cancelForm();
                this.snackBar.openSnackBar(editingId === null ? 'Nota guardada' : 'Nota actualizada', 'successBar');
                this.changeDetector.markForCheck();
            },
            error: error => {
                this.saving = false;
                this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo guardar la nota.'), 'errorBar');
                this.changeDetector.markForCheck();
            }
        });
    }

    requestDelete(note: BookNote): void {
        this.confirmDeleteId = note.Id;
    }

    cancelDelete(): void {
        this.confirmDeleteId = null;
    }

    confirmDelete(): void {
        const noteId = this.confirmDeleteId;
        if (noteId === null || this.deleting)
            return;
        this.deleting = true;
        this.noteSrv.delete(noteId).subscribe({
            next: () => {
                this.notes = this.notes.filter(note => note.Id !== noteId);
                this.deleting = false;
                this.confirmDeleteId = null;
                if (this.editingId === noteId) this.cancelForm();
                this.snackBar.openSnackBar('Nota eliminada', 'successBar');
                this.changeDetector.markForCheck();
            },
            error: error => {
                this.deleting = false;
                this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo eliminar la nota.'), 'errorBar');
                this.changeDetector.markForCheck();
            }
        });
    }
}
