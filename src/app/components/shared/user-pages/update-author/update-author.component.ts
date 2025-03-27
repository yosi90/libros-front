import { Component, Injector, OnDestroy, OnInit, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, forkJoin, merge, Subject, switchMap, tap } from 'rxjs';
import { Author } from '../../../../interfaces/author';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AuthorService } from '../../../../services/entities/author.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { query } from '@angular/animations';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { UniverseService } from '../../../../services/entities/universe.service';

@Component({
    standalone: true,
    selector:  'app-update-author',
    imports: [MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatIconModule, customValidatorsModule, SnackbarModule],
    templateUrl: './update-author.component.html',
    styleUrl: './update-author.component.sass'
})
export class UpdateAuthorComponent implements OnInit, OnDestroy {
    errorNameMessage = '';

    originalAuthor!: Author;
    actualName: string = '';

    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
    ]);

    fgAuthor = this.fBuild.group({
        name: this.name
    });

    private destroy$ = new Subject<void>();

    constructor(private authorSrv: AuthorService,
        private universeSrv: UniverseService,
        private authorStore: AuthorStoreService,
        private universeStore: UniverseStoreService,
        private router: Router,
        private fBuild: FormBuilder,
        private _snackBar: SnackbarModule,
        private loader: LoaderEmmitterService,
        private route: ActivatedRoute,
        private injector: Injector
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
    }

    ngOnInit(): void {
        this.route.params.pipe(
            tap(params => {
                const author = this.authorStore.getAuthor(params['id']);
                this.originalAuthor = author;
                this.actualName = author.Nombre;
                this.name.setValue(author.Nombre);
            }),
            switchMap(() =>
                runInInjectionContext(this.injector, () =>
                    this.name.valueChanges.pipe(
                        filter(nameValue => !!nameValue),
                        takeUntilDestroyed()
                    )
                )
            )
        ).subscribe(nameValue => {
            this.actualName = nameValue ?? '';
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
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
        const authorEntity = { ...this.fgAuthor.value, Id: this.originalAuthor.Id } as Author;

        this.authorSrv.updateAuthor(authorEntity).pipe(
            switchMap((updatedAuthor) =>
                forkJoin({
                    universes: this.universeSrv.getUniverses(),
                    authors: this.authorSrv.getAllAuthors()
                })
            )
        ).subscribe({
            next: ({ universes, authors }) => {
                this.universeStore.setUniverses(universes);
                this.authorStore.setAuthors(authors);
            },
            error: (errorData) => {
                const msg = errorData?.error.error || 'Error al actualizar el autor';
                this._snackBar.openSnackBar(msg, 'errorBar');
                this.loader.deactivateLoader();
            },
            complete: () => {
                this.loader.deactivateLoader();
                this.router.navigateByUrl('/dashboard/books?authorUpdated=true');
            }
        });
    }
}
