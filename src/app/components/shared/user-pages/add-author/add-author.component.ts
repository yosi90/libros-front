import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, map, merge, Observable, of, switchMap, timer } from 'rxjs';
import { Router } from '@angular/router';
import { AuthorService } from '../../../../services/entities/author.service';
import { Author } from '../../../../interfaces/author';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { CatalogService } from '../../../../services/entities/catalog.service';

@Component({
    standalone: true,
    selector:  'app-add-author',
    imports: [MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatIconModule, SnackbarModule],
    templateUrl: './add-author.component.html',
    styleUrl: './add-author.component.sass'
})
export class AddAuthorComponent {
    errorNameMessage = '';

    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ], [this.authorNameExistsValidator()]);

    fgAuthor = this.fBuild.group({
        name: this.name
    });

    constructor(
        private authorSrv: AuthorService,
        private catalogSrv: CatalogService,
        private authorStore: AuthorStoreService,
        private router: Router,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private loader: LoaderEmmitterService
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('authorNameExists'))
            this.errorNameMessage = 'Ya existe un autor con ese nombre';
        else
            this.errorNameMessage = 'Nombre no válido';
    }

    addAuthor(): void {
        if (this.fgAuthor.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgAuthor.errors, 'errorBar');
            return;
        }

        this.loader.activateLoader();
        const authorEntity = this.fgAuthor.value as Author;

        this.authorSrv.addAuthor(authorEntity).subscribe({
            next: (createdAuthor) => {
                this.authorStore.addAuthor(createdAuthor);
                this.router.navigateByUrl('/dashboard/books?authorAdded=true');
            },
            error: (errorData) => {
                this.loader.deactivateLoader();
                const msg = getApiErrorMessage(errorData, 'Error al crear el autor');
                if (this.isDuplicateAuthorError(msg))
                    this.name.setErrors({ ...(this.name.errors ?? {}), authorNameExists: true });
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    private authorNameExistsValidator(): AsyncValidatorFn {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            const value = this.normalizeAuthorName(control.value);
            if (!value || value.length < 3)
                return of(null);

            if (this.authorStore?.getAuthors().some(author => this.normalizeAuthorName(author.Nombre) === value))
                return of({ authorNameExists: true });

            return timer(250).pipe(
                switchMap(() => this.catalogSrv.getAuthors(control.value.trim())),
                map(authors => authors.some(author => this.normalizeAuthorName(author.Nombre) === value) ? { authorNameExists: true } : null),
                catchError(() => of(null))
            );
        };
    }

    private normalizeAuthorName(value: unknown): string {
        return String(value ?? '')
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    private isDuplicateAuthorError(message: string): boolean {
        return /existe|duplicad|unique|constraint/i.test(message);
    }
}
