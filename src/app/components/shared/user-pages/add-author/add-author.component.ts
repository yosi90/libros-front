import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { merge } from 'rxjs';
import { User } from '../../../../interfaces/user';
import { SessionService } from '../../../../services/auth/session.service';
import { Router } from '@angular/router';
import { AuthorService } from '../../../../services/entities/author.service';
import { Author } from '../../../../interfaces/author';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    selector: 'app-add-author',
    standalone: true,
    imports: [MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatIconModule, customValidatorsModule, SnackbarModule],
    templateUrl: './add-author.component.html',
    styleUrl: './add-author.component.sass'
})
export class AddAuthorComponent implements OnInit {
    userData!: User;
    names: string[] = [];

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        this.customValidator.usedTextValidator(this.names)
    ]);

    constructor(private sessionSrv: SessionService, private authorSrv: AuthorService, private router: Router, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private customValidator: customValidatorsModule,
        private loader: LoaderEmmitterService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
    }

    ngOnInit(): void {
        this.loader.activateLoader();
        this.sessionSrv.user.subscribe(user => {
            this.userData = user;
            if (user.authors) {
                this.names = user.authors.map(a => a.name.toLocaleLowerCase());
                this.name = new FormControl('', [
                    Validators.required,
                    Validators.minLength(3),
                    Validators.maxLength(50),
                    this.customValidator.usedTextValidator(this.names)
                ]);
                this.fgAuthor = this.fBuild.group({
                    name: this.name
                });
            }
            this.loader.deactivateLoader();
        });
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
        const authorEntity = this.fgAuthor.value as Author;
        this.authorSrv.addAuthor(authorEntity).subscribe({
            next: (author) => {
                this.userData.authors?.push(author);
                this.sessionSrv.updateUserData(this.userData);
                this.loader.deactivateLoader();
                this.fgAuthor.reset();
                this.router.navigateByUrl('/dashboard/books?authorAdded=true');
            },
            error: (errorData) => {
                this.loader.deactivateLoader();
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }
}