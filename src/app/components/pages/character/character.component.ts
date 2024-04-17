import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../../../services/auth/login.service';
import { BookService } from '../../../services/book/book.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CharacterService } from '../../../services/character/character.service';
import { CharacterT } from '../../../interfaces/templates/character-t';

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
  ],
  templateUrl: './character.component.html',
  styleUrl: './character.component.sass',
})
export class CharacterComponent {
  book?: Book;
  character: Character;

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
    private _snackBar: MatSnackBar
  ) {
    this.character = {
      characterId: 0,
      name: '',
      description: '',
      bookId: 0,
      chapters: [],
    };
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const bookId = params['id'];
      const token = this.loginSrv.token;
      if (token != null && token != '') {
        this.bookSrv.getBook(bookId, token).subscribe({
          next: async (book) => {
            if (book.ownerId == this.loginSrv.userId) {
              this.book = book;
              this.character.bookId = book.bookId;
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

  updateNameErrorMessage() {
    if (this.name.hasError('required'))
      this.errorNameMessage = 'El nombre no puede quedar vacio';
    else if (this.name.hasError('minlength'))
      this.errorNameMessage = 'Nombre demasiado corto';
    else if (this.name.hasError('maxlength'))
      this.errorNameMessage = 'Nombre demasiado largo';
    else this.errorNameMessage = '';
  }

  updateDescriptionErrorMessage() {
    if (this.description.hasError('required'))
      this.errorDescriptionMessage = 'La descripción no puede quedar vacía';
    else if (this.description.hasError('min'))
      this.errorDescriptionMessage =
        'La descripción no puede ser más corta de quince caracteres';
    else this.errorDescriptionMessage = '';
  }

  setCharacter(): void {
    if (this.fgPersonaje.valid) {
      if (this.character?.characterId === 0) this.addCharacter();
      else this.updateCharacter();
    } else if (this.fgPersonaje.errors)
      this.openSnackBar('Error: ' + this.fgPersonaje.errors, 'errorBar');
    else {
      this.updateNameErrorMessage();
      this.updateDescriptionErrorMessage();
      this.openSnackBar('Error: Rellena la información primero', 'errorBar');
    }
  }

  addCharacter(): void {
    this.characterSrv.addCharacter(this.fgPersonaje.value as CharacterT, this.book?.bookId ?? 0, this.loginSrv.token).subscribe({
        next: (character) => {
            this.character = character;
            this.openSnackBar('Personaje guardado', 'successBar');
        },
        error: (errorData) => {
          this.openSnackBar(errorData, 'errorBar');
        },
      });
  }

  updateCharacter(): void {
    console.log('update');
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
