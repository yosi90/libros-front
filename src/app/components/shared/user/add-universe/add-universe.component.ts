import { Component, OnInit } from '@angular/core';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';
import { User } from '../../../../interfaces/user';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../../../services/auth/login.service';
import { UserService } from '../../../../services/entities/user.service';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { map, merge, Observable, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Universe } from '../../../../interfaces/universe';
import { UniverseService } from '../../../../services/entities/universe.service';
import { AsyncPipe } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AuthorService } from '../../../../services/entities/author.service';
import { Author } from '../../../../interfaces/author';

@Component({
    selector: 'app-add-universe',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, NgxLoadingModule, customValidatorsModule, MatAutocompleteModule, AsyncPipe],
    templateUrl: './add-universe.component.html',
    styleUrl: './add-universe.component.sass'
})
export class AddUniverseComponent implements OnInit {
    userData: User = {
        userId: 0,
        name: '',
        email: ''
    }
    names: string[] = [];
    authors: string[] = [];
    filteredAuthors!: Observable<string[]>;

    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000',
    };

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        this.customValidator.usedTextValidator(this.names)
    ]);
    errorAuthorMessage = '';
    author = new FormControl('', [
        Validators.required
    ]);

    constructor(private userSrv: UserService, private loginSrv: LoginService, private universeSrv: UniverseService, private router: Router, private fBuild: FormBuilder, private _snackBar: MatSnackBar, private customValidator: customValidatorsModule, private authorSrv: AuthorService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
    }

    ngOnInit(): void {
        const token = this.loginSrv.token;
        if (token != null && token != '') {
            this.userSrv.getUser(token).subscribe({
                next: async (user) => {
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
                            author: this.author
                        });
                    }
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
            this.authorSrv.getAllAuthors(token).subscribe({
                next: async (authors) => {
                    this.authors = authors.map(a => a.name);
                    this.filteredAuthors = this.author.valueChanges.pipe(
                        startWith(''),
                        map(value => this._filter(value || '')),
                    );
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
        }
    }

    fgUniverse = this.fBuild.group({
        name: this.name,
        author: this.author
    });

    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.authors.filter(option => option.toLowerCase().includes(filterValue));
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacio';
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
            this.errorNameMessage = 'El autor no puede quedar vacio';
        else this.errorNameMessage = 'Autor no válido';
    }

    addUniverse(): void {
        if (this.fgUniverse.invalid) {
            this.openSnackBar('Error: ' + this.fgUniverse.errors, 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.universeSrv.addUniverse(this.fgUniverse.value as Universe, token).subscribe({
            next: () => {
                this.fgUniverse.reset();
                this.router.navigateByUrl('/dashboard/books?universeAdded=true');
            },
            error: (errorData) => {
                this.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    openSnackBar(errorString: string, cssClass: string) {
        this._snackBar.open(errorString, 'Ok', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
            duration: 5000,
            panelClass: [cssClass],
        });
    }
    horizontalPosition: MatSnackBarHorizontalPosition = 'center';
    verticalPosition: MatSnackBarVerticalPosition = 'top';
}
