import { CommonModule, AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, map, merge, startWith } from 'rxjs';
import { SagaService } from '../../../../services/entities/saga.service';
import { Saga } from '../../../../interfaces/saga';
import { MatSelectModule } from '@angular/material/select';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { Universe } from '../../../../interfaces/universe';
import { Author } from '../../../../interfaces/author';
import { NewSaga } from '../../../../interfaces/creation/newSaga';
import { SessionService } from '../../../../services/auth/session.service';

@Component({
    standalone: true,
    selector:  'app-add-saga',
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule,
        MatAutocompleteModule, AsyncPipe, MatSelectModule, SnackbarModule],
    templateUrl: './add-saga.component.html',
    styleUrl: './add-saga.component.sass'
})
export class AddSagaComponent {
    universes: Universe[] = [];
    sagas: Saga[] = [];
    authors: Author[] = [];

    filteredUniverses!: Observable<string[]>;

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ]);
    errorUniverseMessage = '';
    universe = new FormControl('', [
        Validators.required
    ]);
    errorAuthorMessage = '';
    author = new FormControl([], [
        Validators.required
    ]);

    constructor(
        private sessionSrv: SessionService,
        private sagaSrv: SagaService, 
        private router: Router, 
        private fBuild: FormBuilder, 
        private loader: LoaderEmmitterService,
        private _snackBar: SnackbarModule, 
        private universeStore: UniverseStoreService, 
        private authorStore: AuthorStoreService
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.universe.statusChanges, this.universe.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateUniverseErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
        this.universes = universeStore.getUniverses();
        this.sagas = universeStore.getAllSagas();
        this.authors = authorStore.getAuthors();
    }

    ngOnInit(): void {
        this.filteredUniverses = this.universe.valueChanges.pipe(
            startWith(''),
            map(value => this._universeFilter(value || '')),
        );
        this.universe.setValue(this.universes[0].Nombre);
    }

    fgSaga = this.fBuild.group({
        name: this.name,
        universe: this.universe,
        author: this.author
    });

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.universes.map(u => u.Nombre).filter(option => option.toLowerCase().includes(filterValue));
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Saga ya registrada';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateUniverseErrorMessage() {
        if (this.universe.hasError('required'))
            this.errorUniverseMessage = 'El universo no puede quedar vacío';
        else this.errorUniverseMessage = 'Universo no válido';
    }

    updateAuthorErrorMessage() {
        if (this.author.hasError('required'))
            this.errorAuthorMessage = 'El autor no puede quedar vacío';
        else this.errorAuthorMessage = 'Autor no válido';
    }

    addSaga(): void {
        if(this.sessionSrv.userRole.Nombre !== 'administrador' || this.sessionSrv.userRole.Id !== 2){
            this._snackBar.openSnackBar('Lamentablemente esta web es solo de muestra, los usuarios no pueden guardar/modificar datos por el momento', 'errorBar', 6000);
            return;
        }
        if (this.fgSaga.invalid || !this.name.value) {
            this._snackBar.openSnackBar('Error: datos no válidos', 'errorBar');
            return;
        }
    
        this.loader.activateLoader();
    
        const selectedAuthorIds = this.author.value as number[] | null;
        if (!selectedAuthorIds || selectedAuthorIds.length === 0) {
            this._snackBar.openSnackBar('Selecciona al menos un autor', 'errorBar');
            this.loader.deactivateLoader();
            return;
        }
        const selectedAuthors = this.authors.filter(a => selectedAuthorIds.includes(a.Id));
        
        const universeName = this.universe.value;
        if (!universeName) {
            this._snackBar.openSnackBar('Selecciona un universo', 'errorBar');
            this.loader.deactivateLoader();
            return;
        }
        const universe = this.universeStore.getUniverse(universeName);
        if(!universe){
            this._snackBar.openSnackBar('Selecciona un universo', 'errorBar');
            return;
        }
        
        const newsaga: NewSaga = {
            Id: 0,
            Nombre: this.name.value,
            Autores: selectedAuthors,
            Universo: universe,
            UserId: 0
        };
    
        this.sagaSrv.addSaga(newsaga).subscribe({
            next: (createdSaga) => {
                this.universeStore.addSaga(createdSaga, universe);
                this.router.navigateByUrl('/dashboard/books?sagaAdded=true');
            },
            error: (errorData) => {
                const msg = errorData?.error.error || 'Error al crear la saga';
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }
}
