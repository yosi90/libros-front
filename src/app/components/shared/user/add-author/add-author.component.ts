import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { merge } from 'rxjs';
import { UserService } from '../../../../services/entities/user.service';
import { User } from '../../../../interfaces/user';
import { LoginService } from '../../../../services/auth/login.service';
import { Router } from '@angular/router';
import { AuthorService } from '../../../../services/entities/author.service';
import { Author } from '../../../../interfaces/author';
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';

@Component({
    selector: 'app-add-author',
    standalone: true,
    imports: [MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatIconModule, NgxLoadingModule],
    templateUrl: './add-author.component.html',
    styleUrl: './add-author.component.sass'
})
export class AddAuthorComponent implements OnInit {
    userData: User = {
        userId: 0,
        name: '',
        email: ''
    }
    names: string[] = [];

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
        usedTextValidator(this.names)
    ]);

    constructor(private userSrv: UserService, private loginSrv: LoginService, private authorSrv: AuthorService, private router: Router, private fBuild: FormBuilder, private _snackBar: MatSnackBar) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
    }

    ngOnInit(): void {
        const token = this.loginSrv.token;
        if (token != null && token != '') {
            this.userSrv.getUser(token).subscribe({
                next: async (user) => {
                    this.userData = user;
                    if (user.authors) {
                        this.names = user.authors.map(a => a.name.toLocaleLowerCase());
                        this.name = new FormControl('', [
                            Validators.required,
                            Validators.minLength(3),
                            Validators.maxLength(50),
                            usedTextValidator(this.names)
                        ]);
                        this.fgAuthor = this.fBuild.group({
                            name: this.name
                        });
                    }
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
        }
    }

    fgAuthor = this.fBuild.group({
        name: this.name
    });

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacio';
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
            this.openSnackBar('Error: ' + this.fgAuthor.errors, 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.authorSrv.addAuthor(this.fgAuthor.value as Author, token).subscribe({
            next: () => {
                this.fgAuthor.reset();
                this.router.navigateByUrl('/books?authorAdded=true');
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

export function usedTextValidator(valoresProhibidos: string[]): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const valorIngresado = control.value?.toLowerCase();
        if (valoresProhibidos.includes(valorIngresado))
            return { forbiddenValue: true };
        return null;
    };
}