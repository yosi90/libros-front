import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Universe } from '../../../../interfaces/universe';
import { UniverseService } from '../../../../services/entities/universe.service';
import { MatSelectModule } from '@angular/material/select';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { Author } from '../../../../interfaces/author';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { SessionService } from '../../../../services/auth/session.service';

@Component({
    standalone: true,
    selector:  'app-add-universe',
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule, MatSelectModule, SnackbarModule],
    templateUrl: './add-universe.component.html',
    styleUrl: './add-universe.component.sass'
})
export class AddUniverseComponent {
    authors: Author[] = [];

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ]);
    errorAuthorMessage = '';
    author = new FormControl([], [
        Validators.required
    ]);

    constructor(
        private sessionSrv: SessionService,
        private universeSrv: UniverseService, 
        private universeStore: UniverseStoreService, 
        private router: Router, 
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule, 
        private loader: LoaderEmmitterService, 
        private authorStore: AuthorStoreService
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
        this.authors = authorStore.getAuthors();
    }

    fgUniverse = this.fBuild.group({
        name: this.name,
        authors: this.author
    });

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Universo ya registrado';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateAuthorErrorMessage() {
        if (this.author.hasError('required'))
            this.errorNameMessage = 'El universo debe tener al menos un autor';
        else this.errorNameMessage = 'Autor no válido';
    }

    addUniverse(): void {
        if(this.sessionSrv.userRole.Nombre !== 'administrador' || this.sessionSrv.userRole.Id !== 2){
            this._snackBar.openSnackBar('Lamentablemente esta web es solo de muestra, los usuarios no pueden guardar/modificar datos por el momento', 'errorBar', 6000);
            return;
        }
        if (this.fgUniverse.invalid || !this.name.value) {
            this._snackBar.openSnackBar('Error: datos no válidos', 'errorBar');
            return;
        }

        this.loader.activateLoader();

        const selectedAuthorIds = this.author.value as number[] | null;
        if (!selectedAuthorIds || selectedAuthorIds.length === 0) {
            this._snackBar.openSnackBar('Selecciona al menos un autor', 'errorBar');
            return;
        }
        const selectedAuthors = this.authors.filter(a => selectedAuthorIds.includes(a.Id));

        const newUniverse: Universe = {
            Id: 0,
            Nombre: this.name.value,
            Autores: selectedAuthors,
            Sagas: [],
            Libros: [],
            Antologias: []
        };

        this.universeSrv.addUniverse(newUniverse).subscribe({
            next: (createdUniverse) => {
                this.universeStore.addUniverse(createdUniverse);
                this.router.navigateByUrl('/dashboard/books?universeAdded=true');
            },
            error: (errorData) => {
                const msg = errorData?.error.error || 'Error al crear el universo';
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }
}
