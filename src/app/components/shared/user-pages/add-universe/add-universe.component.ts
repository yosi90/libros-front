import { Component, OnInit } from '@angular/core';
import { User } from '../../../../interfaces/user';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
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

@Component({
    selector: 'app-add-universe',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule, MatSelectModule, SnackbarModule],
    templateUrl: './add-universe.component.html',
    styleUrl: './add-universe.component.sass'
})
export class AddUniverseComponent implements OnInit {
    userData: User= {
        userId: -1,
        name: '',
        email: '',
        image: '',
        authors: [],
        universes: [],
        sagas: []
    };
    names: string[] = [];
    authorNames: string[] = [];
    newUniverse: Universe = {
        universeId: 0,
        name: '',
        authorIds: [],
        authors: [],
        userId: 0,
        sagaIds: [],
        sagas: [],
        bookIds: []
    };

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        this.customValidator.usedTextValidator(this.names)
    ]);
    errorAuthorMessage = '';
    author = new FormControl([], [
        Validators.required
    ]);

    constructor(private sessionSrv: SessionService, private universeSrv: UniverseService, private router: Router, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private customValidator: customValidatorsModule,
        private loader: LoaderEmmitterService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
    }

    ngOnInit(): void {
        this.loader.activateLoader();
        this.sessionSrv.user.subscribe({
            next: (user) => {
                this.userData = user;
                if (user.universes) {
                    this.names = user.universes.map(a => a.name.toLocaleLowerCase());
                    this.name = new FormControl('', [
                        Validators.required,
                        Validators.minLength(3),
                        Validators.maxLength(50),
                        this.customValidator.usedTextValidator(this.names)
                    ]);
                    this.fgUniverse = this.fBuild.group({
                        name: this.name,
                        authors: this.author
                    });
                }
                this.loader.deactivateLoader();
            }
        });
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
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El universo debe tener al menos un autor';
        else this.errorNameMessage = 'Autor no válido';
    }

    addUniverse(): void {
        if (this.fgUniverse.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgUniverse.errors, 'errorBar');
            return;
        }
        this.loader.activateLoader();
        this.newUniverse.authors = [];
        this.userData.authors.forEach(a => {
            if (this.authorNames.includes(a.name))
                this.newUniverse.authors.push(a);
        });
        this.universeSrv.addUniverse(this.newUniverse).subscribe({
            next: (universe) => {
                this.sessionSrv.forceUpdateUserData();
                this.loader.deactivateLoader();
                this.fgUniverse.reset();
                this.router.navigateByUrl('/dashboard/books?universeAdded=true');
            },
            error: (errorData) => {
                this.loader.deactivateLoader();
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    fillAuthorsUniverses(universe: Universe): void {
        const universeAuthorsIds = universe.authors.map(a => a.authorId);
        this.userData.authors.forEach(author => {
            if (universeAuthorsIds.includes(author.authorId)) {
                if (!author.universes)
                    author.universes = [];
                if(!author.sagas)
                    author.sagas = [];
                author.universes.push(universe);
                author.sagas = [...universe.sagas];
            }
        });
    }
}
