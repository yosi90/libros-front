import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { merge, Subject, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CharacterT } from '../../../../interfaces/askers/character-t';
import { Book } from '../../../../interfaces/book';
import { Character } from '../../../../interfaces/character';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { SessionService } from '../../../../services/auth/session.service';
import { EmmittersService } from '../../../../services/bookEmmitter.service';
import { BookService } from '../../../../services/entities/book.service';
import { CharacterService } from '../../../../services/entities/character.service';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';

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
        SnackbarModule,
        NgxLoadingModule
    ],
    templateUrl: './character.component.html',
    styleUrl: './character.component.sass',
})
export class CharacterComponent implements OnInit, OnDestroy {
    book!: Book;
    character: Character = {
        characterId: 0,
        name: '',
        description: '',
        bookId: 0,
        chapters: [],
    };
    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000'
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

    private destroy$ = new Subject<void>();

    constructor(private route: ActivatedRoute, private loginSrv: SessionService, private characterSrv: CharacterService, private fBuild: FormBuilder, private bookSrv: BookService,
        private _snackBar: SnackbarModule, private emmiterSrv: EmmittersService) {
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
            this.waitingServerResponse = true;
            this.emmiterSrv.initializeBook(bookId);
            this.emmiterSrv.book$.pipe(takeUntil(this.destroy$)).subscribe((updatedBook: Book | null) => {
                if (updatedBook) {
                    this.book = updatedBook;
                    if (characterId > 0) {
                        this.character = updatedBook.characters.filter(c => c.characterId == characterId)[0];
                        this.initializeForm();
                    }
                    this.waitingServerResponse = false;
                }
            });
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
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
                this.book.characters.push(character);
                this.emmiterSrv.updateBook(this.book);
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
                const index = this.book.characters.findIndex(character => character.characterId === character.characterId);
                if (index !== -1)
                    this.book.characters.splice(index, 1, character);
                this.emmiterSrv.updateBook(this.book);
                this._snackBar.openSnackBar('Personaje actualizado', 'successBar');
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }
}
