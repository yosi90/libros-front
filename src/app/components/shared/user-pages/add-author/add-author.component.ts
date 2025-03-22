import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { merge } from 'rxjs';
import { Router } from '@angular/router';
import { AuthorService } from '../../../../services/entities/author.service';
import { Author } from '../../../../interfaces/author';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';

@Component({
    selector: 'app-add-author',
    standalone: true,
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
    ]);

    fgAuthor = this.fBuild.group({
        name: this.name
    });

    constructor(
        private authorSrv: AuthorService,
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
                const msg = errorData?.message || 'Error al crear el autor';
                this._snackBar.openSnackBar(msg, 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
        
    }
}
