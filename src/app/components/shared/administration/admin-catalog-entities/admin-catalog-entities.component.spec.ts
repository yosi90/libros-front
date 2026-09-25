import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { AuthorService } from '../../../../services/entities/author.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { SagaService } from '../../../../services/entities/saga.service';
import { UniverseService } from '../../../../services/entities/universe.service';
import { AdminCatalogEntitiesComponent, AdminCatalogEntityKind } from './admin-catalog-entities.component';

describe('AdminCatalogEntitiesComponent', () => {
    let fixture: ComponentFixture<AdminCatalogEntitiesComponent>;
    let catalog: jasmine.SpyObj<CatalogService>;
    let authors: jasmine.SpyObj<AuthorService>;
    let sagas: jasmine.SpyObj<SagaService>;
    let snackBar: jasmine.SpyObj<SnackbarModule>;

    async function create(kind: AdminCatalogEntityKind) {
        catalog = jasmine.createSpyObj<CatalogService>('CatalogService', ['getAuthorsPage', 'getUniverses', 'getSagas', 'getLanguages', 'getAllAuthors', 'getOriginPlaces']);
        catalog.getAuthorsPage.and.returnValue(of({ Items: [{ Id: 27, Nombre: 'A.y. Chao', Idioma: { Id: 2, Nombre: 'Inglés' }, LugarOrigen: { Id: 4, Nombre: 'Canadá' } }], Total: 1, Page: 1, PageSize: 10 }) as never);
        catalog.getSagas.and.returnValue(of([{ Id: 14, Nombre: 'Acotar', Subtitulo: null }]) as never);
        catalog.getUniverses.and.returnValue(of([{ Id: 8, Nombre: 'La corte de thronos' }]) as never);
        catalog.getLanguages.and.returnValue(of([{ Id: 2, Nombre: 'Inglés' }]));
        catalog.getAllAuthors.and.returnValue(of([{ Id: 5, Nombre: 'Sarah J. Maas' }]));
        authors = jasmine.createSpyObj<AuthorService>('AuthorService', ['addAuthor', 'updateAuthor']);
        authors.addAuthor.and.returnValue(of({ Id: 99, Nombre: 'Nueva autora' }));
        sagas = jasmine.createSpyObj<SagaService>('SagaService', ['getSaga', 'addSaga', 'updateSaga']);
        sagas.getSaga.and.returnValue(of({ Id: 14, Nombre: 'Acotar', Subtitulo: null, Autores: [{ Id: '5', Nombre: 'Sarah J. Maas' }], Universo: { Id: '8', Nombre: 'La corte de thronos' } }) as never);
        sagas.updateSaga.and.returnValue(of({}) as never);
        snackBar = jasmine.createSpyObj<SnackbarModule>('SnackbarModule', ['openSnackBar']);

        await TestBed.configureTestingModule({
            imports: [AdminCatalogEntitiesComponent],
            providers: [
                { provide: CatalogService, useValue: catalog },
                { provide: AuthorService, useValue: authors },
                { provide: UniverseService, useValue: jasmine.createSpyObj('UniverseService', ['getUniverse', 'addUniverse', 'updateUniverse']) },
                { provide: SagaService, useValue: sagas },
                { provide: SnackbarModule, useValue: snackBar }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AdminCatalogEntitiesComponent);
        fixture.componentRef.setInput('kind', kind);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('crea un autor con idioma y lugar de origen', async () => {
        const component = await create('authors');
        expect(component.rows[0].detail).toBe('Inglés · Canadá');

        component.name.setValue('Nueva autora');
        component.languageId.setValue(2);
        component.originPlace.setValue('Irlanda');
        component.save();

        expect(authors.addAuthor).toHaveBeenCalledOnceWith(jasmine.objectContaining({ Nombre: 'Nueva autora', IdiomaId: 2, LugarOrigenNombre: 'Irlanda' }));
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('Autor creado', 'successBar');
        expect(component.isEditing).toBeFalse();
    });

    it('edita una saga precargando universo y autores desde su detalle', async () => {
        const component = await create('sagas');
        component.edit(component.rows[0]);

        expect(sagas.getSaga).toHaveBeenCalledWith(14);
        expect(component.universeId.value).toBe(8);
        expect(component.authorIds.value).toEqual([5]);

        component.subtitle.setValue('Primera etapa');
        component.save();
        expect(sagas.updateSaga).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            Id: 14,
            Subtitulo: 'Primera etapa',
            Universo: jasmine.objectContaining({ Id: 8 })
        }));
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('Saga actualizada', 'successBar');
    });

    it('no permite guardar un universo sin autores', async () => {
        const component = await create('universes');
        component.name.setValue('Nuevo mundo');
        expect(component.canSave).toBeFalse();
        component.authorIds.setValue([5]);
        expect(component.canSave).toBeTrue();
    });
});
