import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, debounceTime, distinctUntilChanged, finalize, map, takeUntil } from 'rxjs';
import { BookNote } from '../../../../interfaces/note';
import { NoteService } from '../../../../services/entities/note.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { rtfToPlainText } from '../../../../shared/rtf/rtf-text';
import { WebBookNotesViewComponent } from '../../../web/book/web-book-notes-view/web-book-notes-view.component';
import { MobileBookNotesViewComponent } from '../../../mobile/book/mobile-book-notes-view/mobile-book-notes-view.component';
import { markBackendFieldError } from '../../../../shared/backend-field-error';
import { PendingWorkOwner, PendingWorkService } from '../../../../services/auth/pending-work.service';
import { AutosaveStatus, autosaveStatusLabel, isOfflineError } from '../../../../shared/autosave-status';
import { joinList } from '../../../../shared/text';
import { AppToastService } from '../../../../shared/toast/app-toast.service';

interface NoteDraft { editingId: number | null; name: string; description: string }

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
export class BookNotesComponent implements OnInit, OnDestroy, PendingWorkOwner {
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

    /** Web («Cuaderno», F4): cómo va el guardado de la nota del compositor, que se guarda sola. */
    composerStatus: AutosaveStatus = 'idle';
    private composerSaving = false;
    private composerAgain = false;
    /** Lo último que el servidor tiene de la nota del compositor (vacío si es nueva). */
    private composerSaved = this.composerSnapshot();
    private composerLoading = false;
    private draftKeyInUse: string | null = null;
    private abandoned = false;
    private readonly stopPendingWork: () => void;
    private readonly composerChanged$ = new Subject<void>();

    constructor(
        private noteSrv: NoteService,
        private bookStore: BookStoreService,
        private presentation: PresentationModeService,
        private snackBar: SnackbarModule,
        private changeDetector: ChangeDetectorRef,
        private pendingWork: PendingWorkService,
        private toasts: AppToastService
    ) {
        this.stopPendingWork = this.pendingWork.register(this);
    }

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
        this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (!this.savesInPlace || this.composerLoading)
                return;
            this.keepNoteDraft();
            this.composerChanged$.next();
        });
        this.composerChanged$.pipe(debounceTime(1200), takeUntil(this.destroy$)).subscribe(() => this.autosaveComposer());
    }

    ngOnDestroy(): void {
        // Lo que aún no se ha enviado se queda en el dispositivo para esta cuenta.
        if (this.savesInPlace && !this.abandoned)
            this.keepNoteDraft();
        this.stopPendingWork();
        this.destroy$.next();
        this.destroy$.complete();
    }

    /** Vuelve la red: la nota que no pudo guardarse se envía. */
    @HostListener('window:online')
    onOnline(): void {
        if (this.composerStatus === 'offline')
            this.autosaveComposer();
    }

    /** Cambio de cuenta (CAMBIO_DE_CUENTA.md): la nota sin enviar se aparta para quien la escribió y no se envía más. */
    abandon(): void {
        if (this.abandoned)
            return;
        this.keepNoteDraft();
        this.abandoned = true;
    }

    // ---------- Web: el compositor, que se guarda solo ----------

    private get savesInPlace(): boolean { return this.isWebView; }

    /** Hay algo escrito en el compositor que el servidor aún no tiene. */
    get composerPending(): boolean {
        return this.composerSnapshot() !== this.composerSaved && !this.isComposerEmpty();
    }

    get composerStatusLabel(): string {
        return autosaveStatusLabel(this.composerStatus, () => {
            const missing = [
                ...(this.form.controls.name.invalid ? ['el título (2 caracteres)'] : []),
                ...(this.form.controls.description.invalid ? ['el texto (15 caracteres)'] : [])
            ];
            return missing.length ? `Sin guardar: falta ${joinList(missing)}` : 'Sin guardar';
        });
    }

    /** La nota que se está editando no se repite en la lista de debajo. */
    get listedNotes(): BookNote[] {
        return this.visibleNotes.filter(note => note.Id !== this.editingId);
    }

    /** Carga una nota en el compositor. Si lo que había no se puede guardar todavía, no se pierde: se avisa. */
    editInComposer(note: BookNote): boolean {
        if (this.composerPending && this.form.invalid) {
            this.snackBar.openSnackBar('Termina la nota que estás escribiendo, o vacíala, antes de abrir otra', 'infoBar');
            return false;
        }
        if (this.composerPending)
            this.autosaveComposer();
        this.loadComposer(note.Id, note.Nombre, this.noteText(note));
        return true;
    }

    /** «Nota nueva»: guarda lo pendiente y vacía el compositor (si lo escrito aún no se puede guardar, se avisa). */
    startNewNote(): boolean {
        if (this.composerPending && this.form.invalid) {
            this.snackBar.openSnackBar('Termina la nota que estás escribiendo, o vacíala, antes de empezar otra', 'infoBar');
            return false;
        }
        if (this.composerPending)
            this.autosaveComposer();
        this.clearComposer();
        return true;
    }

    /** El compositor queda vacío para una nota nueva (lo de antes ya está guardado o apartado). */
    clearComposer(): void {
        this.loadComposer(null, '', '');
    }

    /** Al salir del compositor con la nota ya guardada, se vacía para la siguiente. */
    leaveComposer(): void {
        if (this.composerPending) {
            this.autosaveComposer();
            return;
        }
        if (this.editingId !== null || this.isComposerEmpty())
            this.clearComposer();
    }

    autosaveComposer(): void {
        if (!this.savesInPlace || this.abandoned || !this.bookId)
            return;
        const snapshot = this.composerSnapshot();
        if (snapshot === this.composerSaved)
            return;
        if (this.isComposerEmpty()) {
            this.composerStatus = 'idle';
            return;
        }
        if (this.form.invalid) {
            this.composerStatus = 'invalid';
            return;
        }
        if (this.composerSaving) {
            this.composerAgain = true;
            return;
        }
        const editingId = this.editingId;
        const payload = { Nombre: this.form.controls.name.value.trim(), Descripcion: this.form.controls.description.value.trim(), LibroId: this.bookId };
        const request: Observable<BookNote> = editingId === null ? this.noteSrv.create(payload) : this.noteSrv.update({ ...payload, Id: editingId });
        this.composerSaving = true;
        this.composerStatus = 'saving';
        request.pipe(
            finalize(() => {
                this.composerSaving = false;
                if (this.composerAgain) {
                    this.composerAgain = false;
                    this.autosaveComposer();
                }
                this.changeDetector.markForCheck();
            }),
            takeUntil(this.destroy$)
        ).subscribe({
            next: saved => {
                if (this.abandoned)
                    return;
                const previous = this.notes.find(item => item.Id === editingId);
                const note: BookNote = saved?.Id ? saved : { ...payload, Id: editingId ?? 0, Fecha: previous?.Fecha ?? '' };
                this.notes = editingId === null ? [note, ...this.notes] : this.notes.map(item => item.Id === editingId ? note : item);
                // Si el compositor sigue con esa nota, desde ahora la edita.
                if (this.editingId === editingId) {
                    this.editingId = note.Id;
                    if (this.composerSnapshot() === snapshot)
                        this.composerSaved = snapshot;
                    else
                        this.composerAgain = true;
                }
                this.composerStatus = this.composerPending ? 'saving' : 'saved';
                this.keepNoteDraft();
            },
            error: error => {
                if (isOfflineError(error)) {
                    this.composerStatus = 'offline';
                    this.keepNoteDraft();
                    return;
                }
                this.composerStatus = 'error';
                markBackendFieldError({ Nombre: this.form.controls.name, Descripcion: this.form.controls.description }, error);
                this.snackBar.openApiError(error, 'No se pudo guardar la nota.');
            }
        });
    }

    private loadComposer(editingId: number | null, name: string, description: string): void {
        this.composerLoading = true;
        this.editingId = editingId;
        this.form.reset({ name, description });
        this.composerLoading = false;
        this.composerSaved = this.composerSnapshot();
        this.composerStatus = 'idle';
        this.draftKeyInUse = null;
    }

    private composerSnapshot(): string {
        return JSON.stringify([this.form.controls.name.value.trim(), this.form.controls.description.value.trim()]);
    }

    private isComposerEmpty(): boolean {
        return !this.form.controls.name.value.trim() && !this.form.controls.description.value.trim();
    }

    private draftKey(editingId: number | null): string {
        return `nota:${this.bookId}:${editingId ?? 'nueva'}`;
    }

    /** Aparta lo que aún no tiene el servidor (o lo retira si ya lo tiene), por entorno y cuenta. */
    private keepNoteDraft(): void {
        const scope = this.pendingWork.scope;
        if (!this.savesInPlace || this.abandoned || !scope || !this.bookId)
            return;
        const key = this.draftKey(this.editingId);
        if (this.draftKeyInUse && this.draftKeyInUse !== key)
            this.pendingWork.take(scope, this.draftKeyInUse);
        if (this.composerPending) {
            this.pendingWork.stash<NoteDraft>(scope, key, {
                editingId: this.editingId, name: this.form.controls.name.value, description: this.form.controls.description.value
            });
            this.draftKeyInUse = key;
        } else {
            this.pendingWork.take(scope, key);
            this.draftKeyInUse = null;
        }
    }

    /** Lo que se escribió y no llegó a guardarse (la app se cerró, o cambió la cuenta) vuelve al compositor. */
    private restoreNoteDraft(): void {
        const scope = this.pendingWork.scope;
        if (!this.savesInPlace || !scope || !this.bookId || this.composerPending)
            return;
        for (const editingId of [null, ...this.notes.map(note => note.Id)]) {
            const draft = this.pendingWork.take<NoteDraft>(scope, this.draftKey(editingId))?.borrador;
            if (!draft)
                continue;
            const original = editingId === null ? null : this.notes.find(note => note.Id === editingId) ?? null;
            this.loadComposer(editingId, original?.Nombre ?? '', original ? this.noteText(original) : '');
            this.form.setValue({ name: draft.name ?? '', description: draft.description ?? '' });
            this.toasts.showSystem('Hemos recuperado la nota que no llegó a guardarse.', {
                title: 'Nota recuperada', dedupeKey: `nota:recuperada:${this.bookId}`, durationMs: 8000
            });
            return;
        }
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
                this.restoreNoteDraft();
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
                markBackendFieldError({ Nombre: this.form.controls.name, Descripcion: this.form.controls.description }, error);
                this.snackBar.openApiError(error, 'No se pudo guardar la nota.');
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
                if (this.editingId === noteId) {
                    if (this.savesInPlace) this.clearComposer();
                    else this.cancelForm();
                }
                this.snackBar.openSnackBar('Nota eliminada', 'successBar');
                this.changeDetector.markForCheck();
            },
            error: error => {
                this.deleting = false;
                this.snackBar.openApiError(error, 'No se pudo eliminar la nota.');
                this.changeDetector.markForCheck();
            }
        });
    }
}
