import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { merge, Subject, switchMap, takeUntil } from 'rxjs';
import { Author } from '../../../../interfaces/author';
import { User } from '../../../../interfaces/user';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { SessionService } from '../../../../services/auth/session.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { AuthorService } from '../../../../services/entities/author.service';

@Component({
    selector: 'app-update-author',
    standalone: true,
    imports: [MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatIconModule, customValidatorsModule, SnackbarModule],
    templateUrl: './update-author.component.html',
    styleUrl: './update-author.component.sass'
})
export class UpdateAuthorComponent {
    userData!: User;
    names: string[] = [];
    originalAuthor: Author = {
        authorId: 0,
        name: '',
        userId: 0,
    };
    actualAuthor: Author = {
        authorId: 0,
        name: '',
        userId: 0,
    };

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        this.customValidator.usedTextValidator(this.names)
    ]);
    
    private destroy$ = new Subject<void>();

    constructor(private sessionSrv: SessionService, private authorSrv: AuthorService, private router: Router, private fBuild: FormBuilder, private _snackBar: SnackbarModule, 
        private customValidator: customValidatorsModule, private loader: LoaderEmmitterService, private route: ActivatedRoute) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
    }

    ngOnInit(): void {
        this.loader.activateLoader();
        this.route.params.pipe(
            switchMap(params => this.authorSrv.getAuthor(params['id']))
        ).subscribe(author => {
            if (!author) {
                this.sessionSrv.logout();
                return;
            }
            this.originalAuthor = author;
            this.actualAuthor = author;
            this.sessionSrv.user.pipe(takeUntil(this.destroy$)).subscribe(user => {
                this.userData = user;
                if (user.authors) {
                    this.names = user.authors.map(a => a.name.toLocaleLowerCase());
                    this.name = new FormControl(this.actualAuthor.name, [
                        Validators.required,
                        Validators.minLength(3),
                        Validators.maxLength(50),
                        this.customValidator.usedTextValidator(this.names, this.originalAuthor.name)
                    ]);
                    this.fgAuthor = this.fBuild.group({
                        name: this.name
                    });
                }
                this.loader.deactivateLoader();
            });
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    fgAuthor = this.fBuild.group({
        name: this.name
    });

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Autor ya registrado';
        else this.errorNameMessage = 'Nombre no válido';
    }

    addAuthor(): void {
        if (this.fgAuthor.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgAuthor.errors, 'errorBar');
            return;
        }
        this.loader.activateLoader();
        this.authorSrv.updateAuthor(this.actualAuthor).subscribe({
            next: (author) => {
                const index = this.userData.authors?.findIndex(a => a.authorId === author.authorId);
                if (this.userData.authors && index && index !== -1)
                    this.userData.authors[index] = author;
                this.sessionSrv.updateUserData(this.userData);
                this.loader.deactivateLoader();
                this.fgAuthor.reset();
                this.router.navigateByUrl('/dashboard/books?authorUpdated=true');
            },
            error: (errorData) => {
                this.loader.deactivateLoader();
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }
}
