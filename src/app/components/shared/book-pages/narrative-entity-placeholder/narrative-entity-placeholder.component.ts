import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Book } from '../../../../interfaces/book';
import { NarrativeEntityCreate } from '../../../../interfaces/api-contract';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { BookService } from '../../../../services/entities/book.service';
import { NarrativeEntityService } from '../../../../services/entities/narrative-entity.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { EntryService, NarrativeEntityKind } from '../../../../services/entities/entry.service';
import { NarrativeEntry, NarrativeEntryCreate } from '../../../../interfaces/api-contract';
import { OrganizationCharacterRelation, OrganizationLocationRelation } from '../../../../interfaces/organization';

@Component({
    standalone: true,
    selector: 'app-narrative-entity-placeholder',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, SnackbarModule],
    templateUrl: './narrative-entity-placeholder.component.html',
    styleUrl: './narrative-entity-placeholder.component.sass'
})
export class NarrativeEntityPlaceholderComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    book: Book = this.bookStore.libroVacio;
    routePath = '';
    selectedCharacterIds: number[] = [];
    selectedItem: any | null = null;
    selectedEntries: NarrativeEntry[] = [];
    organizationCharacterRelations: OrganizationCharacterRelation[] = [];
    organizationLocationRelations: OrganizationLocationRelation[] = [];
    editingEntryId: number | null = null;

    name = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
    entryTitle = new FormControl('', [Validators.maxLength(100)]);
    description = new FormControl('', [Validators.required, Validators.minLength(15)]);
    locationId = new FormControl<number | null>(null);
    page = new FormControl<number | null>(null);
    characterId = new FormControl<number | null>(null);
    detailEntryTitle = new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
    detailEntryDescription = new FormControl('', [Validators.required, Validators.minLength(15)]);
    relationCharacterId = new FormControl<number | null>(null);
    relationLocationId = new FormControl<number | null>(null);
    relationDescription = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(250)]);

    entityForm = this.fBuild.group({
        name: this.name,
        entryTitle: this.entryTitle,
        description: this.description,
        locationId: this.locationId,
        page: this.page,
        characterId: this.characterId
    });

    entityConfig: Record<string, { title: string; singular: string; icon: string; bookKey: keyof Book; createRoute: string }> = {
        characters: { title: 'Personajes', singular: 'personaje', icon: 'co_present', bookKey: 'Personajes', createRoute: 'character' },
        organizations: { title: 'Organizaciones', singular: 'organización', icon: 'groups', bookKey: 'Organizaciones', createRoute: 'organization' },
        events: { title: 'Eventos', singular: 'evento', icon: 'event', bookKey: 'Eventos', createRoute: 'event' },
        locations: { title: 'Localizaciones', singular: 'localización', icon: 'my_location', bookKey: 'Localizaciones', createRoute: 'location' },
        concepts: { title: 'Conceptos', singular: 'concepto', icon: 'auto_awesome', bookKey: 'Conceptos', createRoute: 'concept' },
        quotes: { title: 'Citas', singular: 'cita', icon: 'format_quote', bookKey: 'Citas', createRoute: 'quote' },
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fBuild: FormBuilder,
        private bookStore: BookStoreService,
        private bookSrv: BookService,
        private narrativeSrv: NarrativeEntityService,
        private entrySrv: EntryService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule
    ) { }

    ngOnInit(): void {
        this.routePath = this.route.snapshot.routeConfig?.path ?? '';
        this.bookStore.book$
            .pipe(takeUntil(this.destroy$))
            .subscribe(book => {
                if (book.Id !== 0)
                    this.book = book;
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    isCreateMode(): boolean {
        return ['organization', 'event', 'location', 'concept', 'quote'].includes(this.routePath);
    }

    getListPath(): string {
        const pathMap: Record<string, string> = {
            organization: 'organizations',
            event: 'events',
            location: 'locations',
            concept: 'concepts',
            quote: 'quotes'
        };
        return pathMap[this.routePath] ?? this.routePath;
    }

    getConfig() {
        return this.entityConfig[this.getListPath()] ?? this.entityConfig['concepts'];
    }

    getItems(): any[] {
        const value = this.book[this.getConfig().bookKey];
        return Array.isArray(value) ? value : [];
    }

    getItemDescription(item: any): string {
        return item.Entradas?.[0]?.Descripcion ?? item.Descripcion ?? '';
    }

    getItemMeta(item: any): string {
        if (this.getListPath() === 'quotes' && item.Pagina)
            return `Página ${item.Pagina}`;
        if (item.Estado)
            return item.Estado;
        if (item.OrigenContexto === 'libro_previo')
            return 'Libro previo';
        if (item.EsSagaPrevia)
            return 'Saga previa';
        if (item.EsLibroActual === false)
            return 'Heredado';
        return 'Libro actual';
    }

    navigateToCreate(): void {
        const createRoute = this.getConfig().createRoute;
        if (createRoute === 'character')
            this.router.navigate(['../character'], { relativeTo: this.route });
        else
            this.router.navigate([`../${createRoute}`], { relativeTo: this.route });
    }

    navigateToList(): void {
        this.router.navigate([`../${this.getListPath()}`], { relativeTo: this.route });
    }

    openItem(item: any): void {
        if (this.getListPath() === 'characters') {
            this.router.navigate([`../character/${item.Id}`], { relativeTo: this.route });
            return;
        }

        this.selectedItem = item;
        this.resetEntryForm();
        this.loadSelectedItemDetails();
    }

    canSubmit(): boolean {
        if (this.entityForm.invalid || !this.book.Id)
            return false;
        if (this.routePath === 'event')
            return !!this.locationId.value;
        if (this.routePath === 'quote')
            return !!this.page.value && !!this.characterId.value;
        return true;
    }

    toggleEventCharacter(characterId: number, checked: boolean): void {
        if (checked && !this.selectedCharacterIds.includes(characterId)) {
            this.selectedCharacterIds.push(characterId);
            return;
        }
        if (!checked)
            this.selectedCharacterIds = this.selectedCharacterIds.filter(id => id !== characterId);
    }

    createEntity(): void {
        if (!this.canSubmit()) {
            this.snackBar.openSnackBar('Completa los campos obligatorios', 'errorBar');
            return;
        }

        const basePayload = this.buildBasePayload();
        const request = this.routePath === 'location'
            ? this.narrativeSrv.createLocation(basePayload)
            : this.routePath === 'concept'
                ? this.narrativeSrv.createConcept(basePayload)
                : this.routePath === 'organization'
                    ? this.narrativeSrv.createOrganization(basePayload)
                    : this.routePath === 'event'
                        ? this.narrativeSrv.createEvent({
                            ...basePayload,
                            Id_Localizacion: Number(this.locationId.value),
                            Personajes: this.selectedCharacterIds
                        })
                        : this.narrativeSrv.createQuote({
                            ...basePayload,
                            Pagina: Number(this.page.value),
                            PersonajeId: Number(this.characterId.value)
                        });

        this.loader.activateLoader();
        request.pipe(
            switchMap(() => this.bookSrv.getBook(this.book.Id))
        ).subscribe({
            next: book => {
                this.bookStore.setBook(book);
                this.book = book;
                this.entityForm.reset();
                this.selectedCharacterIds = [];
                this.snackBar.openSnackBar(`${this.capitalize(this.getConfig().singular)} creado`, 'successBar');
                this.loader.deactivateLoader();
                this.navigateToList();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al crear entidad narrativa', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    canEditSelectedItem(): boolean {
        return !!this.selectedItem && this.getListPath() !== 'characters';
    }

    canSubmitEntry(): boolean {
        return !!this.selectedItem && this.detailEntryTitle.valid && this.detailEntryDescription.valid;
    }

    startEntryEdit(entry: NarrativeEntry): void {
        this.editingEntryId = entry.Id;
        this.detailEntryTitle.setValue(entry.Nombre);
        this.detailEntryDescription.setValue(entry.Descripcion);
    }

    cancelEntryEdit(): void {
        this.resetEntryForm();
    }

    saveEntry(): void {
        if (!this.canSubmitEntry()) {
            this.snackBar.openSnackBar('Completa la entrada narrativa', 'errorBar');
            return;
        }

        const payload: NarrativeEntryCreate = {
            Nombre: this.detailEntryTitle.value ?? '',
            Descripcion: this.detailEntryDescription.value ?? ''
        };
        const request: Observable<unknown> = this.editingEntryId
            ? this.entrySrv.update(this.editingEntryId, payload)
            : this.entrySrv.create(this.getEntryKind(), this.selectedItem.Id, this.book.Id, [payload]);

        this.loader.activateLoader();
        request.pipe(
            switchMap(() => this.bookSrv.getBook(this.book.Id))
        ).subscribe({
            next: book => {
                this.bookStore.setBook(book);
                this.book = book;
                this.selectedItem = this.findItemInBook(this.selectedItem.Id);
                this.resetEntryForm();
                this.loadSelectedItemDetails(false);
                this.snackBar.openSnackBar('Entrada guardada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al guardar la entrada', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    deleteEntry(entry: NarrativeEntry): void {
        this.loader.activateLoader();
        this.entrySrv.delete(entry.Id).pipe(
            switchMap(() => this.bookSrv.getBook(this.book.Id))
        ).subscribe({
            next: book => {
                this.bookStore.setBook(book);
                this.book = book;
                this.selectedItem = this.findItemInBook(this.selectedItem.Id);
                this.loadSelectedItemDetails(false);
                this.snackBar.openSnackBar('Entrada eliminada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al eliminar la entrada', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    canSubmitOrganizationCharacterRelation(): boolean {
        return this.getListPath() === 'organizations'
            && !!this.selectedItem
            && !!this.relationCharacterId.value
            && this.relationDescription.valid;
    }

    canSubmitOrganizationLocationRelation(): boolean {
        return this.getListPath() === 'organizations'
            && !!this.selectedItem
            && !!this.relationLocationId.value
            && this.relationDescription.valid;
    }

    addOrganizationCharacterRelation(): void {
        if (!this.canSubmitOrganizationCharacterRelation())
            return;

        this.loader.activateLoader();
        this.narrativeSrv.addOrganizationCharacter(this.selectedItem.Id, {
            LibroId: this.book.Id,
            PersonajeId: Number(this.relationCharacterId.value),
            Descripcion: this.relationDescription.value ?? ''
        }).subscribe({
            next: () => {
                this.relationCharacterId.reset();
                this.relationDescription.reset();
                this.loadOrganizationRelations();
                this.snackBar.openSnackBar('Relación con personaje guardada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al guardar la relación', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    addOrganizationLocationRelation(): void {
        if (!this.canSubmitOrganizationLocationRelation())
            return;

        this.loader.activateLoader();
        this.narrativeSrv.addOrganizationLocation(this.selectedItem.Id, {
            LibroId: this.book.Id,
            LocalizacionId: Number(this.relationLocationId.value),
            Descripcion: this.relationDescription.value ?? ''
        }).subscribe({
            next: () => {
                this.relationLocationId.reset();
                this.relationDescription.reset();
                this.loadOrganizationRelations();
                this.snackBar.openSnackBar('Relación con localización guardada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al guardar la relación', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    deleteOrganizationCharacterRelation(relation: OrganizationCharacterRelation): void {
        this.loader.activateLoader();
        this.narrativeSrv.deleteOrganizationCharacter(relation.OrganizacionId, relation.PersonajeId).subscribe({
            next: () => {
                this.loadOrganizationRelations();
                this.snackBar.openSnackBar('Relación eliminada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al eliminar la relación', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    deleteOrganizationLocationRelation(relation: OrganizationLocationRelation): void {
        this.loader.activateLoader();
        this.narrativeSrv.deleteOrganizationLocation(relation.OrganizacionId, relation.LocalizacionId).subscribe({
            next: () => {
                this.loadOrganizationRelations();
                this.snackBar.openSnackBar('Relación eliminada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al eliminar la relación', 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    getCharacterName(characterId: number): string {
        return this.book.Personajes.find(character => character.Id === characterId)?.Nombre ?? `Personaje ${characterId}`;
    }

    getLocationName(locationId: number): string {
        return this.book.Localizaciones.find(location => location.Id === locationId)?.Nombre ?? `Localización ${locationId}`;
    }

    private loadSelectedItemDetails(showLoader = true): void {
        if (!this.selectedItem)
            return;

        if (showLoader)
            this.loader.activateLoader();

        this.entrySrv.list(this.getEntryKind(), this.selectedItem.Id, this.book.Id).subscribe({
            next: entries => {
                this.selectedEntries = entries;
                if (this.getListPath() === 'organizations')
                    this.loadOrganizationRelations(false);
                if (showLoader)
                    this.loader.deactivateLoader();
            },
            error: () => {
                this.selectedEntries = this.selectedItem?.Entradas ?? [];
                if (showLoader)
                    this.loader.deactivateLoader();
            }
        });
    }

    private loadOrganizationRelations(showLoader = false): void {
        if (!this.selectedItem)
            return;

        if (showLoader)
            this.loader.activateLoader();

        forkJoin({
            characters: this.narrativeSrv.getOrganizationCharacters(this.selectedItem.Id, this.book.Id),
            locations: this.narrativeSrv.getOrganizationLocations(this.selectedItem.Id, this.book.Id)
        }).subscribe({
            next: result => {
                this.organizationCharacterRelations = result.characters;
                this.organizationLocationRelations = result.locations;
                if (showLoader)
                    this.loader.deactivateLoader();
            },
            error: () => {
                this.organizationCharacterRelations = [];
                this.organizationLocationRelations = [];
                if (showLoader)
                    this.loader.deactivateLoader();
            }
        });
    }

    private buildBasePayload(): NarrativeEntityCreate {
        const name = this.name.value ?? '';
        return {
            LibroId: this.book.Id,
            Nombre: name,
            Entradas: [{
                Nombre: this.entryTitle.value || name,
                Descripcion: this.description.value ?? ''
            }]
        };
    }

    private getEntryKind(): NarrativeEntityKind {
        const map: Record<string, NarrativeEntityKind> = {
            locations: 'localizaciones',
            organizations: 'organizaciones',
            concepts: 'conceptos',
            events: 'eventos',
            quotes: 'citas'
        };
        return map[this.getListPath()];
    }

    private resetEntryForm(): void {
        this.editingEntryId = null;
        this.detailEntryTitle.reset();
        this.detailEntryDescription.reset();
    }

    private findItemInBook(itemId: number): any | null {
        return this.getItems().find(item => item.Id === itemId) ?? null;
    }

    private capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
}
