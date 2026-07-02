import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Book } from '../../../../interfaces/book';
import { Character } from '../../../../interfaces/character';
import { NarrativeEntityCreate } from '../../../../interfaces/api-contract';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { BookService } from '../../../../services/entities/book.service';
import { NarrativeEntityService } from '../../../../services/entities/narrative-entity.service';
import { CharacterService } from '../../../../services/entities/character.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { EntryService, NarrativeEntityKind } from '../../../../services/entities/entry.service';
import { NarrativeEntry, NarrativeEntryCreate } from '../../../../interfaces/api-contract';
import { OrganizationCharacterRelation, OrganizationLocationRelation } from '../../../../interfaces/organization';
import { LocationStatus } from '../../../../interfaces/location';
import { getApiErrorMessage } from '../../../../shared/api-error-message';

interface NarrativeCharacterGroup {
    label: string;
    characters: Character[];
}

interface CreateEntryDraft {
    title: FormControl<string | null>;
    description: FormControl<string | null>;
}

interface CreateOrganizationRelationDraft {
    kind: 'character' | 'location';
    id: number;
    name: string;
    description: FormControl<string | null>;
}

interface CreateCharacterRelationDraft {
    id: number;
    name: string;
    relation: FormControl<string | null>;
}

@Component({
    standalone: true,
    selector: 'app-narrative-entity-placeholder',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatTooltipModule, MatAutocompleteModule, SnackbarModule],
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
    locationStates: LocationStatus[] = [];
    organizationCharacterRelations: OrganizationCharacterRelation[] = [];
    organizationLocationRelations: OrganizationLocationRelation[] = [];
    editingEntryId: number | null = null;
    editingOrganizationCharacterId: number | null = null;
    editingOrganizationLocationId: number | null = null;
    groupItemsByOrigin = true;
    editEventCharacterIds: number[] = [];
    characterFilter = new FormControl('');
    createOrganizationRelationFilter = new FormControl('');
    createOrganizationRelations: CreateOrganizationRelationDraft[] = [];
    createCharacterRelationFilter = new FormControl('');
    createCharacterRelations: CreateCharacterRelationDraft[] = [];
    characterStates: LocationStatus[] = [];
    characterAliases: string[] = [];
    characterAliasDraft = new FormControl('', [Validators.minLength(2), Validators.maxLength(100)]);

    name = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
    entryTitle = new FormControl('Descripción', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
    description = new FormControl('Describe la entrada', [Validators.required, Validators.minLength(15)]);
    createEntryDrafts: CreateEntryDraft[] = [
        { title: this.entryTitle, description: this.description }
    ];
    locationId = new FormControl<number | null>(null);
    eventLocationSearch = new FormControl<string | any>('');
    locationStatusId = new FormControl<number | null>(null);
    characterStatusId = new FormControl<number | null>(null);
    characterSex = new FormControl<number | null>(null);
    page = new FormControl<number | null>(null);
    characterId = new FormControl<number | null>(null);
    quoteCharacterSearch = new FormControl<string | Character>('');
    detailEntryTitle = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
    detailEntryDescription = new FormControl('', [Validators.required, Validators.minLength(15)]);
    relationCharacterId = new FormControl<number | null>(null);
    relationLocationId = new FormControl<number | null>(null);
    relationDescription = new FormControl('', [Validators.required, Validators.minLength(15), Validators.maxLength(250)]);
    relationEditDescription = new FormControl('', [Validators.required, Validators.minLength(15), Validators.maxLength(250)]);
    editName = new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
    editLocationId = new FormControl<number | null>(null);
    editPage = new FormControl<number | null>(null);
    editCharacterId = new FormControl<number | null>(null);
    editEstadoId = new FormControl<number | null>(null);

    entityForm = this.fBuild.group({
        name: this.name,
        entryTitle: this.entryTitle,
        description: this.description,
        locationId: this.locationId,
        locationStatusId: this.locationStatusId,
        characterStatusId: this.characterStatusId,
        characterSex: this.characterSex,
        page: this.page,
        characterId: this.characterId
    });

    editForm = this.fBuild.group({
        name: this.editName,
        locationId: this.editLocationId,
        page: this.editPage,
        characterId: this.editCharacterId,
        estadoId: this.editEstadoId
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
        private characterSrv: CharacterService,
        private entrySrv: EntryService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule
    ) { }

    ngOnInit(): void {
        this.routePath = this.route.snapshot.routeConfig?.path ?? '';
        this.configureCharacterValidation();
        this.configureEventValidation();
        this.configureLocationStatusValidation();
        this.configureQuoteValidation();
        this.loadCharacterStates();
        this.loadLocationStates();
        this.bookStore.book$
            .pipe(takeUntil(this.destroy$))
            .subscribe(book => {
                if (book.Id !== 0) {
                    this.book = book;
                    this.mergeLocationStatesFromBook();
                    this.selectDefaultEventLocation();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    isCreateMode(): boolean {
        return ['character', 'organization', 'event', 'location', 'concept', 'quote'].includes(this.routePath);
    }

    getListPath(): string {
        const pathMap: Record<string, string> = {
            character: 'characters',
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

    getTotalLabel(): string {
        const total = this.getItems().length;
        return total === 1 ? this.getConfig().singular : this.getConfig().title.toLowerCase();
    }

    getItemDescription(item: any): string {
        return this.cleanDescription(item.Entradas?.[0]?.Descripcion ?? item.Descripcion ?? '');
    }

    getItemMeta(item: any): string {
        if (this.getListPath() === 'quotes' && item.Pagina)
            return `Página ${item.Pagina}`;
        if (item.Estado)
            return item.Estado;
        if (item.OrigenContexto === 'libro_previo')
            return this.getPreviousBookLabel(item);
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
        this.resetRelationEdit();
        this.populateEditForm(item);
        this.loadSelectedItemDetails();
    }

    getCharacters(): Character[] {
        return [...this.book.Personajes].sort((a, b) => {
            const originA = this.getCharacterOriginSortOrder(a);
            const originB = this.getCharacterOriginSortOrder(b);
            if (originA !== originB)
                return originA - originB;

            const orderA = a.OrdenGrupo ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.OrdenGrupo ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB)
                return orderA - orderB;
            return a.Nombre.localeCompare(b.Nombre);
        });
    }

    getCharacterOriginGroups(): Array<{ label: string; characters: Character[] }> {
        if (!this.groupItemsByOrigin)
            return [{ label: 'Todos los personajes', characters: this.getCharacters() }];

        const groups = new Map<string, Character[]>();
        this.getHistoricalCharacters().forEach(character => {
            const label = this.getCharacterOriginLabel(character);
            groups.set(label, [...(groups.get(label) ?? []), character]);
        });
        return [...groups.entries()]
            .map(([label, characters]) => ({ label, characters }))
            .sort((a, b) => this.getCharacterOriginSortOrder(a.characters[0]) - this.getCharacterOriginSortOrder(b.characters[0]));
    }

    getOriginGroups(): Array<{ label: string; items: any[] }> {
        const groups = new Map<string, any[]>();
        this.getHistoricalItems().forEach(item => {
            const label = this.getItemOriginLabel(item);
            groups.set(label, [...(groups.get(label) ?? []), item]);
        });
        return [...groups.entries()]
            .map(([label, items]) => ({ label, items }))
            .sort((a, b) => this.getItemOriginSortOrder(a.items[0]) - this.getItemOriginSortOrder(b.items[0]));
    }

    getMixedCharacters(): Character[] {
        return [...this.book.Personajes].sort((a, b) => {
            const orderA = this.getCharacterBookStateSortOrder(a);
            const orderB = this.getCharacterBookStateSortOrder(b);
            if (orderA !== orderB)
                return orderA - orderB;
            return a.Nombre.localeCompare(b.Nombre);
        });
    }

    getMixedItems(): any[] {
        if (this.getListPath() === 'characters')
            return this.getMixedCharacters();

        return [...this.getItems()].sort((a, b) => (a.Nombre ?? '').localeCompare(b.Nombre ?? ''));
    }

    shouldShowViewMode(): boolean {
        return !this.isCreateMode()
            && this.getHistoricalItems().some(item => item.OrigenContexto === 'libro_previo');
    }

    getCurrentCharacters(): Character[] {
        return this.getCharacters().filter(character => this.isCurrentBookCharacter(character));
    }

    getCharacterGroups(): NarrativeCharacterGroup[] {
        const groups = new Map<string, Character[]>();
        const filter = this.normalizeText(this.characterFilter.value ?? '');
        this.getCharacters()
            .filter(character => !filter || this.normalizeText(character.Nombre).includes(filter))
            .forEach(character => {
                const label = character.Grupo || 'Sin grupo';
                groups.set(label, [...(groups.get(label) ?? []), character]);
            });

        return [...groups.entries()]
            .map(([label, characters]) => ({ label, characters }))
            .sort((a, b) => {
                const orderA = Math.min(...a.characters.map(character => character.OrdenGrupo ?? Number.MAX_SAFE_INTEGER));
                const orderB = Math.min(...b.characters.map(character => character.OrdenGrupo ?? Number.MAX_SAFE_INTEGER));
                if (orderA !== orderB)
                    return orderA - orderB;
                return a.label.localeCompare(b.label);
            });
    }

    getLinkedOrganizationCharacterIds(): number[] {
        return this.organizationCharacterRelations.map(relation => relation.PersonajeId);
    }

    getOrganizationCharacterUsage(characterId: number): boolean {
        return this.organizationCharacterRelations.some(relation => relation.PersonajeId === characterId);
    }

    prepareOrganizationCharacterRelation(character: Character): void {
        this.relationCharacterId.setValue(character.Id);
    }

    prepareEventCharacter(character: Character): void {
        const isSelected = this.routePath === 'event'
            ? this.selectedCharacterIds.includes(character.Id)
            : this.editEventCharacterIds.includes(character.Id);
        if (this.routePath === 'event')
            this.toggleEventCharacter(character.Id, !isSelected);
        else
            this.toggleEditEventCharacter(character.Id, !isSelected);
    }

    getEventCharacterUsage(characterId: number): boolean {
        return (this.routePath === 'event' ? this.selectedCharacterIds : this.editEventCharacterIds).includes(characterId);
    }

    getFilteredEventLocations(): any[] {
        const value = this.eventLocationSearch.value;
        const filter = this.normalizeText(typeof value === 'string' ? value : value?.Nombre ?? '');
        return this.book.Localizaciones.filter(location => !filter || this.normalizeText(location.Nombre).includes(filter));
    }

    displayEventLocation(location: any | string | null): string {
        if (!location)
            return '';
        return typeof location === 'string' ? location : location.Nombre;
    }

    selectEventLocation(location: any): void {
        this.locationId.setValue(location.Id);
        this.eventLocationSearch.setValue(location, { emitEvent: false });
    }

    clearEventLocationIfTyped(): void {
        const value = this.eventLocationSearch.value;
        if (typeof value === 'string')
            this.locationId.reset();
    }

    getFilteredCreateOrganizationCharacters(): Character[] {
        const filter = this.normalizeText(this.createOrganizationRelationFilter.value ?? '');
        return this.getCharacters().filter(character => !filter || this.normalizeText(character.Nombre).includes(filter));
    }

    getFilteredCreateOrganizationLocations(): any[] {
        const filter = this.normalizeText(this.createOrganizationRelationFilter.value ?? '');
        return this.book.Localizaciones
            .filter(location => this.normalizeText(location.Nombre) !== 'sin localizacion')
            .filter(location => !filter || this.normalizeText(location.Nombre).includes(filter));
    }

    addCreateOrganizationCharacterRelation(character: Character): void {
        if (this.hasCreateOrganizationRelation('character', character.Id))
            return;

        this.createOrganizationRelations.push({
            kind: 'character',
            id: character.Id,
            name: character.Nombre,
            description: new FormControl('')
        });
    }

    addCreateOrganizationLocationRelation(location: any): void {
        if (this.hasCreateOrganizationRelation('location', location.Id))
            return;

        this.createOrganizationRelations.push({
            kind: 'location',
            id: location.Id,
            name: location.Nombre,
            description: new FormControl('')
        });
    }

    removeCreateOrganizationRelation(relation: CreateOrganizationRelationDraft): void {
        this.createOrganizationRelations = this.createOrganizationRelations.filter(item => item !== relation);
    }

    hasCreateOrganizationRelation(kind: CreateOrganizationRelationDraft['kind'], id: number): boolean {
        return this.createOrganizationRelations.some(relation => relation.kind === kind && relation.id === id);
    }

    getFilteredCreateCharacterRelations(): Character[] {
        const filter = this.normalizeText(this.createCharacterRelationFilter.value ?? '');
        return this.getCharacters().filter(character => !filter || this.normalizeText(character.Nombre).includes(filter));
    }

    addCreateCharacterRelation(character: Character): void {
        if (this.hasCreateCharacterRelation(character.Id))
            return;

        this.createCharacterRelations.push({
            id: character.Id,
            name: character.Nombre,
            relation: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)])
        });
    }

    removeCreateCharacterRelation(relation: CreateCharacterRelationDraft): void {
        this.createCharacterRelations = this.createCharacterRelations.filter(item => item !== relation);
    }

    hasCreateCharacterRelation(characterId: number): boolean {
        return this.createCharacterRelations.some(relation => relation.id === characterId);
    }

    addCharacterAlias(): void {
        const alias = (this.characterAliasDraft.value ?? '').trim();
        if (this.characterAliasDraft.invalid || alias.length < 2 || this.characterAliases.includes(alias))
            return;

        this.characterAliases.push(alias);
        this.characterAliasDraft.reset('');
    }

    removeCharacterAlias(alias: string): void {
        this.characterAliases = this.characterAliases.filter(item => item !== alias);
    }

    getFilteredQuoteCharacters(): Character[] {
        const value = this.quoteCharacterSearch.value;
        const filter = this.normalizeText(typeof value === 'string' ? value : value?.Nombre ?? '');
        return this.getCharacters().filter(character => !filter || this.normalizeText(character.Nombre).includes(filter));
    }

    displayQuoteCharacter(character: Character | string | null): string {
        if (!character)
            return '';
        return typeof character === 'string' ? character : character.Nombre;
    }

    selectQuoteCharacter(character: Character): void {
        this.characterId.setValue(character.Id);
        this.quoteCharacterSearch.setValue(character, { emitEvent: false });
    }

    clearQuoteCharacterIfTyped(): void {
        const value = this.quoteCharacterSearch.value;
        if (typeof value === 'string')
            this.characterId.reset();
    }

    getHistoricalCharacters(): Character[] {
        return this.getCharacters().filter(character => !this.isCurrentBookCharacter(character));
    }

    getCurrentItems(): any[] {
        return this.getSortedItemsByOrigin().filter(item => this.isCurrentItem(item));
    }

    getHistoricalItems(): any[] {
        return this.getSortedItemsByOrigin().filter(item => !this.isCurrentItem(item));
    }

    getCharacterOriginLabel(character: Character): string {
        if (character.EsLibroActual || character.OrigenContexto === 'actual')
            return 'Libro actual';
        if (character.OrigenContexto === 'libro_previo')
            return this.getPreviousBookLabel(character);
        const order = character.OrdenOrigen !== undefined && character.OrdenOrigen !== null ? `${character.OrdenOrigen}º - ` : '';
        if (character.EsSagaPrevia || character.OrigenContexto === 'saga_previa')
            return `${order}Saga previa`;
        if (character.EsSeccionOrigen)
            return `${order}Sección de saga`;
        if (character.OrigenContexto === 'saga_base')
            return `${order}Saga base`;
        return `${order}Contexto actual`;
    }

    getCharacterGroupLabel(character: Character): string {
        return character.Grupo ?? 'Sin grupo';
    }

    getCharacterStatusLabel(character: Character): string {
        return character.Estados?.[character.Estados.length - 1]?.Estado?.Nombre ?? '';
    }

    getCharacterIcon(character: Character): string {
        const customIcon = this.getCharacterCustomIcon(character);
        if (customIcon)
            return customIcon;

        const status = this.normalizeText(this.getCharacterStatusLabel(character));
        if (status.includes('desaparecid'))
            return 'wrong_location';

        switch (character.Grupo) {
            case 'Principales':
                return 'star';
            case 'Recurrentes':
                return 'sync_alt';
            case 'Secundarios':
                return '';
            case 'Desaparecidos':
                return 'wrong_location';
            case 'Muertos':
                return '☠';
            case 'Antiguos':
                return 'history';
            default:
                return 'person_outline';
        }
    }

    getCharacterClasses(character: Character): string[] {
        const classes = ['narrative-chip', 'character-chip'];
        const group = this.normalizeText(character.Grupo ?? 'sin grupo').replace(/\s+/g, '-');
        classes.push(`character-chip--${group}`);
        if (!this.isCurrentBookCharacter(character))
            classes.push('narrative-chip--historical');

        const status = this.normalizeText(this.getCharacterStatusLabel(character));
        if (status.includes('asesinad'))
            classes.push('character-chip--asesinado');
        else if (status.includes('muert'))
            classes.push('character-chip--muerto');
        else if (status.includes('desaparecid'))
            classes.push('character-chip--desaparecido');

        return classes;
    }

    shouldShowCharacterIcon(character: Character): boolean {
        return !!this.getCharacterIcon(character);
    }

    shouldUseMaterialCharacterIcon(character: Character): boolean {
        return !this.getCharacterCustomIcon(character);
    }

    getItemTooltip(item: any): string {
        if (this.getListPath() === 'characters')
            return this.getCharacterGroupLabel(item) + (this.getCharacterStatusLabel(item) ? ' · ' + this.getCharacterStatusLabel(item) : '');

        const meta = this.getItemMeta(item);
        const description = this.getItemDescription(item);
        return description ? `${meta} · ${description}` : meta;
    }

    getItemIcon(item: any): string {
        if (this.getListPath() === 'characters')
            return this.getCharacterIcon(item);

        return this.getConfig().icon;
    }

    getItemClasses(item: any): string[] {
        if (this.getListPath() === 'characters')
            return this.getCharacterClasses(item);

        const classes = ['narrative-chip', `narrative-chip--${this.getListPath()}`];
        if (this.selectedItem?.Id === item.Id)
            classes.push('narrative-chip--selected');
        if (!this.isCurrentItem(item))
            classes.push('narrative-chip--historical');
        return classes;
    }

    shouldShowItemIcon(item: any): boolean {
        if (this.getListPath() === 'characters')
            return this.shouldShowCharacterIcon(item);
        return true;
    }

    shouldUseMaterialItemIcon(item: any): boolean {
        if (this.getListPath() === 'characters')
            return this.shouldUseMaterialCharacterIcon(item);
        return true;
    }

    private getCharacterCustomIcon(character: Character): string {
        const status = this.normalizeText(this.getCharacterStatusLabel(character));
        if (status.includes('asesinad'))
            return '✕';
        if (status.includes('muert'))
            return '☠';
        if (character.Grupo === 'Muertos')
            return '☠';
        return '';
    }

    canSubmit(): boolean {
        return this.entityForm.valid
            && this.areCreateEntriesValid()
            && (this.routePath !== 'character' || this.areCreateCharacterRelationsValid())
            && !!this.book.Id;
    }

    canAddCreateEntry(): boolean {
        return this.areCreateEntriesValid();
    }

    addCreateEntry(): void {
        if (!this.canAddCreateEntry())
            return;

        this.createEntryDrafts.push({
            title: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]),
            description: new FormControl('', [Validators.required, Validators.minLength(15)])
        });
    }

    removeCreateEntry(index: number): void {
        if (this.createEntryDrafts.length === 1) {
            this.createEntryDrafts[0].title.reset();
            this.createEntryDrafts[0].description.reset();
            return;
        }

        this.createEntryDrafts.splice(index, 1);
    }

    getCreateEntryActionHint(): string {
        return this.areCreateEntriesValid()
            ? ''
            : 'Completa las entradas existentes: título mínimo 3 caracteres y descripción mínima 15.';
    }

    getCreateSubmitHint(): string {
        if (!this.book.Id)
            return 'Espera a que el libro esté cargado.';
        if (this.name.invalid)
            return 'El nombre debe tener al menos 3 caracteres.';
        if (this.routePath === 'character' && this.characterStatusId.invalid)
            return 'Selecciona un estado para el personaje.';
        if (this.routePath === 'character' && this.characterSex.invalid)
            return 'Selecciona sexo o género del personaje.';
        if (this.routePath === 'character' && !this.areCreateCharacterRelationsValid())
            return 'Completa el parentesco de las relaciones seleccionadas.';
        if (this.routePath === 'location' && this.locationStatusId.invalid)
            return 'Selecciona un estado para la localización.';
        if (this.routePath === 'event' && this.locationId.invalid)
            return 'Selecciona una localización para el evento.';
        if (this.routePath === 'quote' && this.page.invalid)
            return 'Indica la página de la cita.';
        if (this.routePath === 'quote' && this.characterId.invalid)
            return 'Selecciona el personaje de la cita.';
        return this.getCreateEntryActionHint();
    }

    toggleEventCharacter(characterId: number, checked: boolean): void {
        if (checked && !this.selectedCharacterIds.includes(characterId)) {
            this.selectedCharacterIds.push(characterId);
            return;
        }
        if (!checked)
            this.selectedCharacterIds = this.selectedCharacterIds.filter(id => id !== characterId);
    }

    toggleEditEventCharacter(characterId: number, checked: boolean): void {
        if (checked && !this.editEventCharacterIds.includes(characterId)) {
            this.editEventCharacterIds.push(characterId);
            return;
        }
        if (!checked)
            this.editEventCharacterIds = this.editEventCharacterIds.filter(id => id !== characterId);
    }

    createEntity(): void {
        if (!this.canSubmit()) {
            this.snackBar.openSnackBar('Completa los campos obligatorios', 'errorBar');
            return;
        }

        const basePayload = this.buildBasePayload();
        const request = this.routePath === 'location'
            ? this.narrativeSrv.createLocation(this.buildLocationCreatePayload(basePayload))
            : this.routePath === 'character'
                ? this.createCharacterWithDetails(basePayload)
                : this.routePath === 'concept'
                    ? this.narrativeSrv.createConcept(basePayload)
                    : this.routePath === 'organization'
                        ? this.createOrganizationWithRelations(basePayload)
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
                this.resetCreateForm();
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

    canSubmitRootEdit(): boolean {
        if (!this.selectedItem || this.editName.invalid || !this.book.Id)
            return false;
        if (this.getListPath() === 'events')
            return !!this.editLocationId.value;
        if (this.getListPath() === 'quotes')
            return !!this.editPage.value && !!this.editCharacterId.value;
        return true;
    }

    saveRootEdit(): void {
        if (!this.canSubmitRootEdit()) {
            this.editForm.markAllAsTouched();
            this.snackBar.openSnackBar('Revisa los datos de la entidad', 'errorBar');
            return;
        }

        const request = this.getRootUpdateRequest();
        if (!request)
            return;

        const selectedItemId = this.selectedItem.Id;
        this.loader.activateLoader();
        request.pipe(
            switchMap(() => this.bookSrv.getBook(this.book.Id))
        ).subscribe({
            next: book => {
                this.bookStore.setBook(book);
                this.book = book;
                this.selectedItem = this.findItemInBook(selectedItemId);
                if (this.selectedItem)
                    this.populateEditForm(this.selectedItem);
                this.snackBar.openSnackBar(`${this.capitalize(this.getConfig().singular)} actualizado`, 'successBar');
                this.loader.deactivateLoader();
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al actualizar entidad narrativa'), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    canDetachSelectedItem(): boolean {
        return !!this.selectedItem && this.getListPath() !== 'characters' && this.isCurrentItem(this.selectedItem);
    }

    detachSelectedItem(): void {
        if (!this.canDetachSelectedItem())
            return;

        const confirmed = window.confirm(`¿Quitar ${this.selectedItem.Nombre} de este libro?`);
        if (!confirmed)
            return;

        const request = this.getDetachRequest();
        if (!request)
            return;

        this.loader.activateLoader();
        request.pipe(
            switchMap(() => this.bookSrv.getBook(this.book.Id))
        ).subscribe({
            next: book => {
                this.bookStore.setBook(book);
                this.book = book;
                this.selectedItem = null;
                this.selectedEntries = [];
                this.organizationCharacterRelations = [];
                this.organizationLocationRelations = [];
                this.snackBar.openSnackBar(`${this.capitalize(this.getConfig().singular)} quitado del libro`, 'successBar');
                this.loader.deactivateLoader();
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al quitar la entidad del libro'), 'errorBar');
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

    updateDetailEntryDescriptionFromEditor(event: Event): void {
        const element = event.target as HTMLElement;
        this.detailEntryDescription.setValue(element.innerText || '');
    }

    updateCreateDescriptionFromEditor(event: Event): void {
        this.updateCreateEntryDescriptionFromEditor(this.createEntryDrafts[0], event);
    }

    updateCreateEntryDescriptionFromEditor(entry: CreateEntryDraft, event: Event): void {
        const element = event.target as HTMLElement;
        entry.description.setValue(element.innerText || '');
        entry.description.markAsTouched();
    }

    getCreateEntryDescriptionText(entry: CreateEntryDraft): string {
        return entry.description.value ?? '';
    }

    private loadLocationStates(): void {
        if (this.routePath !== 'location')
            return;

        this.narrativeSrv.getLocationStates()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: states => {
                    this.locationStates = this.mergeLocationStates(this.locationStates, states);
                    this.mergeLocationStatesFromBook();
                    this.selectDefaultLocationStatus();
                },
                error: () => {
                    this.mergeLocationStatesFromBook();
                    this.selectDefaultLocationStatus();
                }
            });
    }

    private loadCharacterStates(): void {
        if (this.routePath !== 'character')
            return;

        this.characterSrv.getStateCatalog()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: states => {
                    this.characterStates = states;
                    this.selectDefaultCharacterStatus();
                },
                error: () => this.characterStates = []
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

    startEditOrganizationCharacterRelation(relation: OrganizationCharacterRelation): void {
        this.editingOrganizationCharacterId = relation.PersonajeId;
        this.editingOrganizationLocationId = null;
        this.relationEditDescription.setValue(relation.Descripcion);
    }

    startEditOrganizationLocationRelation(relation: OrganizationLocationRelation): void {
        this.editingOrganizationLocationId = relation.LocalizacionId;
        this.editingOrganizationCharacterId = null;
        this.relationEditDescription.setValue(relation.Descripcion);
    }

    cancelRelationEdit(): void {
        this.resetRelationEdit();
    }

    updateOrganizationCharacterRelation(relation: OrganizationCharacterRelation): void {
        if (!this.selectedItem || this.relationEditDescription.invalid)
            return;

        this.loader.activateLoader();
        this.narrativeSrv.updateOrganizationCharacter(relation.OrganizacionId, relation.PersonajeId, {
            LibroId: this.book.Id,
            Descripcion: this.relationEditDescription.value ?? ''
        }).subscribe({
            next: () => {
                this.resetRelationEdit();
                this.loadOrganizationRelations();
                this.snackBar.openSnackBar('Relación actualizada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al actualizar la relación'), 'errorBar');
                this.loader.deactivateLoader();
            }
        });
    }

    updateOrganizationLocationRelation(relation: OrganizationLocationRelation): void {
        if (!this.selectedItem || this.relationEditDescription.invalid)
            return;

        this.loader.activateLoader();
        this.narrativeSrv.updateOrganizationLocation(relation.OrganizacionId, relation.LocalizacionId, {
            LibroId: this.book.Id,
            Descripcion: this.relationEditDescription.value ?? ''
        }).subscribe({
            next: () => {
                this.resetRelationEdit();
                this.loadOrganizationRelations();
                this.snackBar.openSnackBar('Relación actualizada', 'successBar');
                this.loader.deactivateLoader();
            },
            error: errorData => {
                this.snackBar.openSnackBar(getApiErrorMessage(errorData, 'Error al actualizar la relación'), 'errorBar');
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
            Entradas: this.createEntryDrafts.map(entry => ({
                Nombre: entry.title.value ?? name,
                Descripcion: entry.description.value ?? ''
            }))
        };
    }

    private buildLocationCreatePayload(basePayload: NarrativeEntityCreate) {
        const payload: NarrativeEntityCreate & { EstadoId?: number } = { ...basePayload };
        if (this.locationStatusId.value)
            payload.EstadoId = Number(this.locationStatusId.value);
        return payload;
    }

    private createOrganizationWithRelations(basePayload: NarrativeEntityCreate): Observable<unknown> {
        return this.narrativeSrv.createOrganization(basePayload).pipe(
            switchMap(organization => {
                const relationRequests = this.createOrganizationRelations.map(relation => relation.kind === 'character'
                    ? this.narrativeSrv.addOrganizationCharacter(organization.Id, {
                        LibroId: this.book.Id,
                        PersonajeId: relation.id,
                        Descripcion: relation.description.value ?? ''
                    })
                    : this.narrativeSrv.addOrganizationLocation(organization.Id, {
                        LibroId: this.book.Id,
                        LocalizacionId: relation.id,
                        Descripcion: relation.description.value ?? ''
                    }));

                return relationRequests.length ? forkJoin(relationRequests) : of(organization);
            })
        );
    }

    private createCharacterWithDetails(basePayload: NarrativeEntityCreate): Observable<unknown> {
        return this.characterSrv.create({
            LibroId: this.book.Id,
            Apodo: basePayload.Nombre,
            Sexo: Number(this.characterSex.value),
            Entradas: basePayload.Entradas
        }).pipe(
            switchMap(character => {
                const requests: Observable<unknown>[] = [
                    this.characterSrv.createState(character.Id, {
                        LibroId: this.book.Id,
                        EstadoId: Number(this.characterStatusId.value)
                    }),
                    ...this.createCharacterRelations.map(relation => this.characterSrv.createRelation(character.Id, {
                        LibroId: this.book.Id,
                        PersonajeRelacionadoId: relation.id,
                        Parentesco: relation.relation.value ?? '',
                        Reflejada: false
                    })),
                    ...this.characterAliases.map(alias => this.characterSrv.createAlias(character.Id, {
                        LibroId: this.book.Id,
                        Apodo: alias
                    }))
                ];

                return forkJoin(requests);
            })
        );
    }

    private configureCharacterValidation(): void {
        if (this.routePath === 'character') {
            this.characterStatusId.setValidators([Validators.required]);
            this.characterSex.setValidators([Validators.required]);
        } else {
            this.characterStatusId.clearValidators();
            this.characterSex.clearValidators();
        }
        this.characterStatusId.updateValueAndValidity();
        this.characterSex.updateValueAndValidity();
    }

    private configureEventValidation(): void {
        if (this.routePath === 'event')
            this.locationId.setValidators([Validators.required]);
        else
            this.locationId.clearValidators();
        this.locationId.updateValueAndValidity();
    }

    private configureLocationStatusValidation(): void {
        if (this.routePath === 'location')
            this.locationStatusId.setValidators([Validators.required]);
        else
            this.locationStatusId.clearValidators();
        this.locationStatusId.updateValueAndValidity();
    }

    private configureQuoteValidation(): void {
        if (this.routePath === 'quote') {
            this.page.setValidators([Validators.required, Validators.min(1)]);
            this.characterId.setValidators([Validators.required]);
        } else {
            this.page.clearValidators();
            this.characterId.clearValidators();
        }
        this.page.updateValueAndValidity();
        this.characterId.updateValueAndValidity();
    }

    private mergeLocationStatesFromBook(): void {
        const states = this.book.Localizaciones
            .flatMap(location => location.Estados ?? [])
            .filter(state => !!state?.Id && !!state?.Nombre);
        this.locationStates = this.mergeLocationStates(this.locationStates, states);
        this.selectDefaultLocationStatus();
    }

    private mergeLocationStates(currentStates: LocationStatus[], nextStates: LocationStatus[]): LocationStatus[] {
        const statesById = new Map<number, LocationStatus>();
        [...currentStates, ...nextStates].forEach(state => {
            if (state?.Id && state?.Nombre)
                statesById.set(state.Id, state);
        });
        return [...statesById.values()].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
    }

    private selectDefaultLocationStatus(): void {
        if (this.routePath !== 'location' || this.locationStatusId.value)
            return;

        const defaultStatus = this.locationStates.find(state => this.normalizeText(state.Nombre) === 'buen estado');
        if (defaultStatus)
            this.locationStatusId.setValue(defaultStatus.Id);
    }

    private selectDefaultEventLocation(): void {
        if (this.routePath !== 'event' || this.locationId.value)
            return;

        const defaultLocation = this.book.Localizaciones.find(location => this.normalizeText(location.Nombre) === 'sin localizacion');
        if (defaultLocation)
            this.selectEventLocation(defaultLocation);
    }

    private selectDefaultCharacterStatus(): void {
        if (this.routePath !== 'character' || this.characterStatusId.value)
            return;

        const defaultStatus = this.characterStates.find(state => this.normalizeText(state.Nombre) === 'vivo');
        if (defaultStatus)
            this.characterStatusId.setValue(defaultStatus.Id);
    }

    private areCreateCharacterRelationsValid(): boolean {
        return this.createCharacterRelations.every(relation => relation.relation.valid);
    }

    private areCreateEntriesValid(): boolean {
        return this.createEntryDrafts.length > 0
            && this.createEntryDrafts.every(entry => entry.title.valid && entry.description.valid);
    }

    private resetCreateForm(): void {
        this.entityForm.reset();
        this.eventLocationSearch.reset('');
        this.quoteCharacterSearch.reset('');
        this.createOrganizationRelationFilter.reset('');
        this.createOrganizationRelations = [];
        this.createCharacterRelationFilter.reset('');
        this.createCharacterRelations = [];
        this.characterAliases = [];
        this.characterAliasDraft.reset('');
        this.entryTitle.setValue('Descripción');
        this.description.setValue('Describe la entrada');
        this.createEntryDrafts = [
            { title: this.entryTitle, description: this.description }
        ];
        this.selectDefaultLocationStatus();
        this.selectDefaultEventLocation();
        this.selectDefaultCharacterStatus();
    }

    private populateEditForm(item: any): void {
        this.editName.setValue(item.Nombre ?? '');
        this.editEstadoId.setValue(item.Id_Estado ?? null);
        this.editLocationId.setValue(item.Id_Localizacion ?? null);
        this.editPage.setValue(item.Pagina ?? null);
        this.editCharacterId.setValue(item.Id_Personaje ?? item.Personaje?.Id ?? null);
        this.editEventCharacterIds = this.extractEntityIds(item.Personajes);
    }

    private getRootUpdateRequest(): Observable<unknown> | null {
        if (!this.selectedItem)
            return null;

        const basePayload = {
            LibroId: this.book.Id,
            Nombre: this.editName.value ?? ''
        };

        switch (this.getListPath()) {
            case 'locations':
                return this.narrativeSrv.updateLocation(this.selectedItem.Id, this.buildLocationUpdatePayload(basePayload));
            case 'concepts':
                return this.narrativeSrv.updateConcept(this.selectedItem.Id, basePayload);
            case 'organizations':
                return this.narrativeSrv.updateOrganization(this.selectedItem.Id, basePayload);
            case 'events':
                return this.narrativeSrv.updateEvent(this.selectedItem.Id, {
                    ...basePayload,
                    Id_Localizacion: Number(this.editLocationId.value),
                    Personajes: this.editEventCharacterIds
                });
            case 'quotes':
                return this.narrativeSrv.updateQuote(this.selectedItem.Id, {
                    ...basePayload,
                    Pagina: Number(this.editPage.value),
                    PersonajeId: Number(this.editCharacterId.value)
                });
            default:
                return null;
        }
    }

    private getDetachRequest(): Observable<unknown> | null {
        if (!this.selectedItem)
            return null;

        switch (this.getListPath()) {
            case 'locations':
                return this.narrativeSrv.detachLocationFromBook(this.selectedItem.Id, this.book.Id);
            case 'concepts':
                return this.narrativeSrv.detachConceptFromBook(this.selectedItem.Id, this.book.Id);
            case 'organizations':
                return this.narrativeSrv.detachOrganizationFromBook(this.selectedItem.Id, this.book.Id);
            case 'events':
                return this.narrativeSrv.detachEventFromBook(this.selectedItem.Id, this.book.Id);
            case 'quotes':
                return this.narrativeSrv.detachQuoteFromBook(this.selectedItem.Id, this.book.Id);
            default:
                return null;
        }
    }

    private buildLocationUpdatePayload(basePayload: { LibroId: number; Nombre: string }) {
        const payload: { LibroId: number; Nombre: string; EstadoId?: number } = { ...basePayload };
        if (this.editEstadoId.value)
            payload.EstadoId = Number(this.editEstadoId.value);
        return payload;
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

    private resetRelationEdit(): void {
        this.editingOrganizationCharacterId = null;
        this.editingOrganizationLocationId = null;
        this.relationEditDescription.reset();
    }

    private findItemInBook(itemId: number): any | null {
        return this.getItems().find(item => item.Id === itemId) ?? null;
    }

    private capitalize(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    private cleanDescription(value: string): string {
        if (!value)
            return '';
        if (!value.trim().startsWith('{\\rtf'))
            return value;
        return value
            .replace(/\{\\fonttbl[^}]*\}/g, '')
            .replace(/\{\\colortbl[^}]*\}/g, '')
            .replace(/\\par[d]?/g, ' ')
            .replace(/\\line/g, ' ')
            .replace(/\\'[0-9a-fA-F]{2}/g, '')
            .replace(/\\[a-zA-Z]+\d* ?/g, '')
            .replace(/[{}]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private extractEntityIds(items: Array<number | { Id: number }> | undefined): number[] {
        if (!Array.isArray(items))
            return [];
        return items
            .map(item => typeof item === 'number' ? item : item.Id)
            .filter(id => Number.isFinite(id));
    }

    private normalizeText(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase()
            .trim();
    }

    private isCurrentBookCharacter(character: Character): boolean {
        return !!character.EsLibroActual || character.OrigenContexto === 'actual';
    }

    private isCurrentItem(item: any): boolean {
        if (this.getListPath() === 'characters')
            return this.isCurrentBookCharacter(item);
        return item.EsLibroActual !== false && item.OrigenContexto !== 'libro_previo' && item.OrigenContexto !== 'saga_previa' && item.OrigenContexto !== 'saga_base';
    }

    private getSortedItemsByOrigin(): any[] {
        if (this.getListPath() === 'characters')
            return this.getCharacters();

        return [...this.getItems()].sort((a, b) => {
            const originA = this.getItemOriginSortOrder(a);
            const originB = this.getItemOriginSortOrder(b);
            if (originA !== originB)
                return originA - originB;
            return (a.Nombre ?? '').localeCompare(b.Nombre ?? '');
        });
    }

    private getItemOriginLabel(item: any): string {
        if (this.getListPath() === 'characters')
            return this.getCharacterOriginLabel(item);
        if (this.isCurrentItem(item))
            return 'Libro actual';
        if (item.OrigenContexto === 'libro_previo')
            return this.getPreviousBookLabel(item);
        const order = item.OrdenOrigen !== undefined && item.OrdenOrigen !== null ? `${item.OrdenOrigen}º - ` : '';
        if (item.EsSagaPrevia || item.OrigenContexto === 'saga_previa')
            return `${order}Saga previa`;
        if (item.EsSeccionOrigen)
            return `${order}Sección de saga`;
        if (item.OrigenContexto === 'saga_base')
            return `${order}Saga base`;
        return `${order}Contexto actual`;
    }

    private getItemOriginSortOrder(item: any): number {
        if (this.getListPath() === 'characters')
            return this.getCharacterOriginSortOrder(item);
        if (this.isCurrentItem(item))
            return Number.NEGATIVE_INFINITY;
        if (item.OrdenOrigen !== undefined && item.OrdenOrigen !== null)
            return Number(item.OrdenOrigen);
        if (item.OrigenContexto === 'libro_previo')
            return 1000;
        if (item.EsSagaPrevia || item.OrigenContexto === 'saga_previa')
            return 2000;
        if (item.EsSeccionOrigen)
            return 3000;
        if (item.OrigenContexto === 'saga_base')
            return 4000;
        return Number.MAX_SAFE_INTEGER;
    }

    private getCharacterOriginSortOrder(character: Character): number {
        if (this.isCurrentBookCharacter(character))
            return Number.NEGATIVE_INFINITY;
        if (character.OrdenOrigen !== undefined && character.OrdenOrigen !== null)
            return Number(character.OrdenOrigen);
        if (character.OrigenContexto === 'libro_previo')
            return 1000;
        if (character.EsSagaPrevia || character.OrigenContexto === 'saga_previa')
            return 2000;
        if (character.EsSeccionOrigen)
            return 3000;
        if (character.OrigenContexto === 'saga_base')
            return 4000;
        return Number.MAX_SAFE_INTEGER;
    }

    private getCharacterBookStateSortOrder(character: Character): number {
        if (character.OrdenGrupo !== undefined && character.OrdenGrupo !== null)
            return character.OrdenGrupo;

        switch (character.Grupo) {
            case 'Principales':
                return 1;
            case 'Recurrentes':
                return 2;
            case 'Secundarios':
                return 3;
            case 'Desaparecidos':
                return 4;
            case 'Muertos':
                return 5;
            case 'Antiguos':
                return 6;
            default:
                return Number.MAX_SAFE_INTEGER;
        }
    }

    private getPreviousBookLabel(item: { OrdenOrigen?: number | null }): string {
        const order = item.OrdenOrigen;
        const prefix = order !== undefined && order !== null ? `${order}º - ` : '';
        const previousBook = this.book.LibrosPrevios?.find(book => order !== undefined && order !== null && Math.abs(Number(book.Orden) - Number(order)) < 0.0001);
        return `${prefix}${previousBook?.Nombre ?? 'Libro previo'}`;
    }
}
