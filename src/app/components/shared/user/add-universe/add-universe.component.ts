import { Component, OnInit } from '@angular/core';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { User } from '../../../../interfaces/user';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
import { UserService } from '../../../../services/entities/user.service';
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
import { AuthorService } from '../../../../services/entities/author.service';
import { MatSelectModule } from '@angular/material/select';
import { Author } from '../../../../interfaces/author';
import { SnackbarModule } from '../../../../modules/snackbar.module';

@Component({
    selector: 'app-add-universe',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, NgxLoadingModule, customValidatorsModule, MatSelectModule, SnackbarModule],
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
    authors: Author[] = [];

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
    author = new FormControl([], [
        Validators.required
    ]);

    constructor(private userSrv: UserService, private loginSrv: SessionService, private universeSrv: UniverseService, private router: Router, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private customValidator: customValidatorsModule, private authorSrv: AuthorService) {
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
                    this.authors = authors;
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
        if(this.waitingServerResponse)
            return;
        this.waitingServerResponse = true;
        const token = this.loginSrv.token;
        this.universeSrv.addUniverse(this.fgUniverse.value as Universe, token).subscribe({
            next: () => {
                this.waitingServerResponse = false;
                this.fgUniverse.reset();
                this.router.navigateByUrl('/dashboard/books?universeAdded=true');
            },
            error: (errorData) => {
                this.waitingServerResponse = false;
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
        });
    }
}
