import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { Character, CharacterAlias, CharacterRelation } from '../../../../interfaces/character';
import { BookService } from '../../../../services/entities/book.service';
import { CharacterService } from '../../../../services/entities/character.service';
import { EntryService } from '../../../../services/entities/entry.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { NarrativeEntry } from '../../../../interfaces/api-contract';
import { LocationStatus } from '../../../../interfaces/location';

@Component({
    standalone: true,
    selector:  'app-character',
    imports: [
        CommonModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        ReactiveFormsModule
    ],
    templateUrl: './character.component.html',
    styleUrl: './character.component.sass'
})
export class CharacterComponent implements OnInit, OnDestroy {
    book: Book | null = null;
    character: Character | null = null;
    stateCatalog: LocationStatus[] = [];
    isCreationRoute = false;
    private bookId = 0;

    createForm = this.fBuild.group({
        apodo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        sexo: [true, Validators.required],
        entradaNombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        entradaDescripcion: ['', [Validators.required, Validators.minLength(15)]],
    });

    aliasForm = this.fBuild.group({
        apodo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        modo: ['narrative', Validators.required],
    });

    associateForm = this.fBuild.group({
        apodo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    });

    aliasEditForm = this.fBuild.group({
        apodo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    });

    stateForm = this.fBuild.group({
        estadoId: [1, [Validators.required, Validators.min(1)]],
    });

    rootForm = this.fBuild.group({
        sexo: [0, [Validators.required]],
    });

    relationForm = this.fBuild.group({
        personajeRelacionadoId: [0, [Validators.required, Validators.min(1)]],
        parentesco: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        reflejada: [false],
    });

    relationEditForm = this.fBuild.group({
        personajeRelacionadoId: [0, [Validators.required, Validators.min(1)]],
        parentesco: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        reflejada: [false],
    });

    entryForm = this.fBuild.group({
        nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        descripcion: ['', [Validators.required, Validators.minLength(15)]],
    });

    editingRelationId: number | null = null;
    editingAliasId: number | null = null;
    editingEntryId: number | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fBuild: FormBuilder,
        private bookSrv: BookService,
        private characterSrv: CharacterService,
        private entrySrv: EntryService,
        private bookStore: BookStoreService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule
    ) { }

    ngOnInit(): void {
        this.loader.activateLoader();
        this.characterSrv.getStateCatalog().pipe(takeUntil(this.destroy$)).subscribe({ next: states => this.stateCatalog = states, error: () => this.stateCatalog = [] });
        this.route.params.subscribe((params) => {
            this.bookId = Number(params['id']);
            const characterId = Number(params['crid']);
            this.isCreationRoute = !characterId;

            this.loadBook(characterId || undefined);
        });
    }

    loadBook(characterId?: number): void {
        this.bookSrv.getBook(this.bookId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (book: Book) => {
                    this.book = book;
                    this.bookStore.setBook(book);
                    this.character = characterId ? book.Personajes.find(c => c.Id === characterId) ?? null : null;
                    this.initializeEditForms();
                    this.loader.deactivateLoader();
                },
                error: () => {
                    this.book = null;
                    this.character = null;
                    this.loader.deactivateLoader();
                }
            });
    }

    initializeEditForms(): void {
        if (!this.character) return;
        this.aliasForm.patchValue({ apodo: this.character.Nombre, modo: 'narrative' });
        this.associateForm.patchValue({ apodo: this.character.Nombre });
        const currentStateId = this.character.Estados?.[this.character.Estados.length - 1]?.Estado?.Id ?? 1;
        this.stateForm.patchValue({ estadoId: currentStateId });
        this.rootForm.patchValue({ sexo: this.normalizeSexValue(this.character.Sexo) });
    }

    getStatusName(status: Character['Estados'][number]): string {
        return status.Estado?.Nombre ?? '';
    }

    getRelativeName(relation: Character['Relaciones'][number]): string {
        return relation.Relativo?.Nombre ?? this.getCharacterNameById(relation.PersonajeRelacionadoId);
    }

    getAliasName(alias: Character['Apodos'][number]): string {
        return alias.Apodo;
    }

    get originLabel(): string {
        if (!this.character) return '';
        if (this.character.EsLibroActual) return 'Libro actual';
        if (this.character.EsSagaPrevia) return 'Saga previa';
        if (this.character.EsSeccionOrigen) return 'Seccion de saga';
        if (this.character.OrigenContexto === 'libro_previo') return 'Libro previo';
        if (this.character.OrigenContexto === 'saga_base') return 'Saga base';
        return 'Contexto actual';
    }

    get hasMetrics(): boolean {
        return !!this.character && (
            this.character.Apariciones !== undefined ||
            this.character.Nombramientos !== undefined ||
            this.character.TextoApariciones !== undefined
        );
    }

    get hasAliases(): boolean {
        return !!this.character?.Apodos?.length;
    }

    get hasEntries(): boolean {
        return !!this.character?.Entradas?.length;
    }

    get hasStatuses(): boolean {
        return !!this.character?.Estados?.length;
    }

    get hasRelations(): boolean {
        return !!this.character?.Relaciones?.length;
    }

    get canAssociateToCurrentBook(): boolean {
        return !!this.character && !!this.book && this.character.EsLibroActual === false;
    }

    get canDetachFromCurrentBook(): boolean {
        return !!this.character && !!this.book && this.character.EsLibroActual !== false;
    }

    get relatedCharacterOptions(): Character[] {
        if (!this.book || !this.character) return [];
        return this.book.Personajes
            .filter(character => character.Id !== this.character?.Id)
            .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
    }

    getCharacterNameById(characterId?: number): string {
        if (!characterId) return '';
        return this.book?.Personajes.find(character => character.Id === characterId)?.Nombre ?? 'Personaje no disponible';
    }

    getRelationCharacterId(relation: CharacterRelation): number {
        return relation.Relativo?.Id ?? relation.PersonajeRelacionadoId ?? 0;
    }

    createCharacter(): void {
        if (!this.book || this.createForm.invalid) {
            this.createForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa los datos del personaje', 'errorBar');
            return;
        }

        const value = this.createForm.getRawValue();
        const apodo = value.apodo ?? '';
        this.loader.activateLoader();
        this.characterSrv.create({
            LibroId: this.book.Id,
            Apodo: apodo,
            Sexo: value.sexo ?? true,
            Entradas: [{
                Nombre: value.entradaNombre || apodo,
                Descripcion: value.entradaDescripcion ?? '',
            }]
        }).subscribe({
            next: character => {
                this.snackBar.openSnackBar('Personaje creado', 'successBar');
                this.router.navigateByUrl(`/book/${this.book?.Id}/character/${character.Id}`);
                this.loader.deactivateLoader();
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    saveAlias(): void {
        if (!this.book || !this.character || this.aliasForm.invalid) {
            this.aliasForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa el apodo', 'errorBar');
            return;
        }

        const value = this.aliasForm.getRawValue();
        const payload = { Apodo: value.apodo ?? '' };
        const mode = value.modo;
        this.loader.activateLoader();

        const request$: Observable<Character | CharacterAlias> = mode === 'correction'
            ? this.characterSrv.correctAlias(this.character.Id, this.book.Id, payload)
            : mode === 'known'
                ? this.characterSrv.createAlias(this.character.Id, { LibroId: this.book.Id, Apodo: payload.Apodo })
                : this.characterSrv.changeNarrativeAlias(this.character.Id, this.book.Id, payload);

        request$.subscribe({
            next: () => {
                this.snackBar.openSnackBar('Apodo actualizado', 'successBar');
                this.loadBook(this.character?.Id);
            },
            error: (errorData: string) => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    associateToCurrentBook(): void {
        if (!this.book || !this.character || this.associateForm.invalid) {
            this.associateForm.markAllAsTouched();
            this.snackBar.openSnackBar('Indica el apodo contextual', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.characterSrv.addToBook(this.character.Id, {
            LibroId: this.book.Id,
            Apodo: this.associateForm.getRawValue().apodo ?? this.character.Nombre,
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Personaje asociado al libro', 'successBar');
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    startEditAlias(alias: CharacterAlias): void {
        this.editingAliasId = alias.ApodoId;
        this.aliasEditForm.reset({ apodo: alias.Apodo });
    }

    cancelEditAlias(): void {
        this.editingAliasId = null;
        this.aliasEditForm.reset({ apodo: '' });
    }

    updateKnownAlias(alias: CharacterAlias): void {
        if (!this.character || this.aliasEditForm.invalid) {
            this.aliasEditForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa el apodo', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.characterSrv.updateAlias(this.character.Id, alias.ApodoId, {
            Apodo: this.aliasEditForm.getRawValue().apodo ?? '',
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Apodo corregido', 'successBar');
                this.cancelEditAlias();
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    deleteAlias(alias: CharacterAlias): void {
        if (!this.character) return;

        this.loader.activateLoader();
        this.characterSrv.deleteAlias(this.character.Id, alias.ApodoId).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Apodo eliminado', 'successBar');
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    saveState(): void {
        if (!this.book || !this.character || this.stateForm.invalid) {
            this.stateForm.markAllAsTouched();
            this.snackBar.openSnackBar('Indica un estado válido', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.characterSrv.updateBookState(this.character.Id, this.book.Id, {
            EstadoId: Number(this.stateForm.getRawValue().estadoId)
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Estado actualizado', 'successBar');
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    saveRootData(): void {
        if (!this.character || this.rootForm.invalid) {
            this.rootForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa los datos del personaje', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.characterSrv.updateRoot(this.character.Id, {
            Sexo: Number(this.rootForm.getRawValue().sexo)
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Datos del personaje actualizados', 'successBar');
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al actualizar el personaje'), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    createRelation(): void {
        if (!this.book || !this.character || this.relationForm.invalid) {
            this.relationForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa la relacion', 'errorBar');
            return;
        }

        const value = this.relationForm.getRawValue();
        this.loader.activateLoader();
        this.characterSrv.createRelation(this.character.Id, {
            LibroId: this.book.Id,
            PersonajeRelacionadoId: Number(value.personajeRelacionadoId),
            Parentesco: value.parentesco ?? '',
            Reflejada: value.reflejada ?? false,
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Relacion creada', 'successBar');
                this.relationForm.reset({ personajeRelacionadoId: 0, parentesco: '', reflejada: false });
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    startEditRelation(relation: CharacterRelation): void {
        this.editingRelationId = relation.Id;
        this.relationEditForm.reset({
            personajeRelacionadoId: this.getRelationCharacterId(relation),
            parentesco: relation.Parentesco,
            reflejada: relation.Reflejada ?? false,
        });
    }

    cancelEditRelation(): void {
        this.editingRelationId = null;
        this.relationEditForm.reset({ personajeRelacionadoId: 0, parentesco: '', reflejada: false });
    }

    updateRelation(relationId: number): void {
        if (!this.book || !this.character || this.relationEditForm.invalid) {
            this.relationEditForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa la relacion', 'errorBar');
            return;
        }

        const value = this.relationEditForm.getRawValue();
        this.loader.activateLoader();
        this.characterSrv.updateRelation(this.character.Id, relationId, {
            LibroId: this.book.Id,
            PersonajeRelacionadoId: Number(value.personajeRelacionadoId),
            Parentesco: value.parentesco ?? '',
            Reflejada: value.reflejada ?? false,
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Relacion actualizada', 'successBar');
                this.cancelEditRelation();
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    deleteRelation(relationId: number): void {
        if (!this.character) return;

        this.loader.activateLoader();
        this.characterSrv.deleteRelation(this.character.Id, relationId).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Relacion eliminada', 'successBar');
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    canSubmitEntry(): boolean {
        return !!this.book && !!this.character && this.entryForm.valid;
    }

    startEntryEdit(entry: NarrativeEntry): void {
        this.editingEntryId = entry.Id;
        this.entryForm.reset({
            nombre: entry.Nombre,
            descripcion: entry.Descripcion
        });
    }

    cancelEntryEdit(): void {
        this.editingEntryId = null;
        this.entryForm.reset({ nombre: '', descripcion: '' });
    }

    saveEntry(): void {
        if (!this.book || !this.character || this.entryForm.invalid) {
            this.entryForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa la entrada narrativa', 'errorBar');
            return;
        }

        const value = this.entryForm.getRawValue();
        const payload = {
            Nombre: value.nombre ?? '',
            Descripcion: value.descripcion ?? ''
        };
        const request$: Observable<unknown> = this.editingEntryId
            ? this.entrySrv.update(this.editingEntryId, payload)
            : this.entrySrv.create('personajes', this.character.Id, this.book.Id, [payload]);

        this.loader.activateLoader();
        request$.subscribe({
            next: () => {
                this.snackBar.openSnackBar('Entrada guardada', 'successBar');
                this.cancelEntryEdit();
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al guardar la entrada'), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    deleteEntry(entry: NarrativeEntry): void {
        if (!this.character)
            return;

        this.loader.activateLoader();
        this.entrySrv.delete(entry.Id).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Entrada eliminada', 'successBar');
                this.loadBook(this.character?.Id);
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al eliminar la entrada'), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    detachFromCurrentBook(): void {
        if (!this.book || !this.character)
            return;

        const confirmed = window.confirm(`¿Quitar ${this.character.Nombre} de este libro?`);
        if (!confirmed)
            return;

        this.loader.activateLoader();
        this.characterSrv.detachFromBook(this.character.Id, this.book.Id).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Personaje quitado del libro', 'successBar');
                const bookId = this.book?.Id;
                this.bookSrv.getBook(bookId ?? 0).subscribe({
                    next: book => {
                        this.bookStore.setBook(book);
                        this.loader.deactivateLoader();
                        this.router.navigateByUrl(`/book/${book.Id}/characters`);
                    },
                    error: errorData => {
                        this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al refrescar el libro'), 'errorBar');
                        this.loader.deactivateLoader();
                    }
                });
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al quitar el personaje del libro'), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    private normalizeSexValue(value: boolean | number | null): number {
        if (typeof value === 'number')
            return value;
        if (value === true)
            return 0;
        if (value === false)
            return 1;
        return 2;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
