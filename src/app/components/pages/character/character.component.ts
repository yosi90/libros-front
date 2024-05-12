import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Character } from '../../../interfaces/character';
import { Book } from '../../../interfaces/book';
import {
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../../../services/auth/login.service';
import { BookService } from '../../../services/entities/book.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CharacterService } from '../../../services/entities/character.service';
import { CharacterT } from '../../../interfaces/askers/character-t';
import { EmmittersService } from '../../../services/emmitters.service';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnackbarModule } from '../../../modules/snackbar.module';

@Component({
    selector: 'app-character',
    standalone: true,
    imports: [
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        CommonModule,
        MatFormFieldModule,
        FormsModule,
        ReactiveFormsModule,
        SnackbarModule
    ],
    templateUrl: './character.component.html',
    styleUrl: './character.component.sass',
})
export class CharacterComponent {
    book?: Book;
    character: Character  = {
        characterId: 0,
        name: '',
        description: '',
        bookId: 0,
        chapters: [],
    };

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
    ]);
    errorDescriptionMessage = '';
    description = new FormControl('', [
        Validators.required,
        Validators.minLength(15),
    ]);
    fgPersonaje = this.fBuild.group({
        name: this.name,
        description: this.description,
    });

    constructor(
        private route: ActivatedRoute,
        private loginSrv: LoginService,
        private characterSrv: CharacterService,
        private router: Router,
        private fBuild: FormBuilder,
        private bookSrv: BookService,
        private _snackBar: SnackbarModule,
        private emmiterSrv: EmmittersService
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.description.statusChanges, this.description.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateDescriptionErrorMessage());
    }

    ngOnInit(): void {
        this.route.params.subscribe((params) => {
            const bookId = params['id'];
            const characterId = params['crid'];
            const token = this.loginSrv.token;
            if (token != null && token != '') {
                this.bookSrv.getBook(bookId, token).subscribe({
                    next: async (book) => {
                        if (book.userId == this.loginSrv.userId) {
                            this.book = book;
                            if (characterId > 0) {
                                this.character = book.characters.filter(c => c.characterId == characterId)[0];
                                this.initializeForm();
                            }
                        } else {
                            this.loginSrv.logout();
                            this.router.navigateByUrl('/home');
                        }
                    },
                    error: () => {
                        this.loginSrv.logout();
                        this.router.navigateByUrl('/home');
                    },
                });
            }
        });
    }

    initializeForm(): void {
        this.name.setValue(this.character?.name ?? '');
        this.description.setValue(this.character?.description ?? '');
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else this.errorNameMessage = '';
    }

    updateDescriptionErrorMessage() {
        if (this.description.hasError('required'))
            this.errorDescriptionMessage = 'La descripción no puede quedar vacía';
        else if (this.description.hasError('minlength'))
            this.errorDescriptionMessage = 'La descripción no puede ser más corta de quince caracteres';
        else this.errorDescriptionMessage = '';
    }

    setCharacter(): void {
        if (this.fgPersonaje.valid) {
            if (this.character?.characterId === 0) this.addCharacter();
            else this.updateCharacter();
        } else if (this.fgPersonaje.errors)
            this._snackBar.openSnackBar('Error: ' + this.fgPersonaje.errors, 'errorBar');
        else {
            this.updateNameErrorMessage();
            this.updateDescriptionErrorMessage();
            this._snackBar.openSnackBar('Error: Rellena la información primero', 'errorBar');
        }
    }

    addCharacter(): void {
        this.characterSrv.addCharacter(this.fgPersonaje.value as CharacterT, this.book?.bookId ?? 0, this.loginSrv.token).subscribe({
            next: (character) => {
                this.character = character;
                this.emmiterSrv.sendNewCharacter(character);
                this._snackBar.openSnackBar('Personaje guardado', 'successBar');
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    updateCharacter(): void {
        if (this.fgPersonaje.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgPersonaje.errors, 'errorBar');
            return;
        } else if (this.fgPersonaje.value.name === this.character.name && this.fgPersonaje.value.description === this.character.description) {
            this._snackBar.openSnackBar('No ha camiado ningún valor', 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.characterSrv.updateCharacter(this.fgPersonaje.value as CharacterT, this.character.characterId, token).subscribe({
            next: (character) => {
                this.character = character;
                this.emmiterSrv.sendUpdatedCharacter(character);
                this._snackBar.openSnackBar('Personaje actualizado', 'successBar');
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }
}
