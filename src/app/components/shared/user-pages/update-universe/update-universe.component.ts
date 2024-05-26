import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { merge, Subject, switchMap, takeUntil } from 'rxjs';
import { Universe } from '../../../../interfaces/universe';
import { User } from '../../../../interfaces/user';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { SessionService } from '../../../../services/auth/session.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { UniverseService } from '../../../../services/entities/universe.service';

@Component({
    selector: 'app-update-universe',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule, MatSelectModule, SnackbarModule],
    templateUrl: './update-universe.component.html',
    styleUrl: './update-universe.component.sass'
})
export class UpdateUniverseComponent implements OnInit, OnDestroy {
    userData: User = {
        userId: -1,
        name: '',
        email: '',
        image: '',
        authors: [],
        universes: [],
        sagas: []
    };
    names: string[] = [];
    originalUniverse!: Universe;
    actualUniverse: Universe = {
        universeId: 0,
        name: '',
        authorIds: [],
        authors: [],
        userId: 0,
        sagaIds: [],
        sagas: [],
        bookIds: []
    };
    authorNames: string[] = [];

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

    private destroy$ = new Subject<void>();

    constructor(private sessionSrv: SessionService, private universeSrv: UniverseService, private router: Router, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private customValidator: customValidatorsModule,
        private loader: LoaderEmmitterService, private route: ActivatedRoute) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
    }

    ngOnInit(): void {
        this.loader.activateLoader();
        this.route.params.pipe(
            switchMap(params => this.universeSrv.getCreatedUniverse(params['id']))
        ).subscribe(universe => {
            if (!universe) {
                this.sessionSrv.logout();
                return;
            }
            this.originalUniverse = universe;
            this.actualUniverse = universe;
            this.authorNames = universe.authors.map(a => a.name);
            this.sessionSrv.user.pipe(takeUntil(this.destroy$)).subscribe(user => {
                this.userData = user;
                if (user.universes) {
                    this.names = user.universes.map(a => a.name.toLocaleLowerCase());
                    this.name = new FormControl(this.originalUniverse.name, [
                        Validators.required,
                        Validators.minLength(3),
                        Validators.maxLength(50),
                        this.customValidator.usedTextValidator(this.names, this.originalUniverse.name)
                    ]);
                    this.fgUniverse = this.fBuild.group({
                        name: this.name,
                        author: this.author
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
        this.loader.activateLoader();
        this.actualUniverse.authors = [];
        this.userData.authors.forEach(a => {
            if (this.authorNames.includes(a.name))
                this.actualUniverse.authors.push(a);
        });
        this.universeSrv.updateUniverse(this.actualUniverse).subscribe({
            next: () => {
                this.sessionSrv.forceUpdateUserData();
                this.fgUniverse.reset();
                this.router.navigateByUrl('/dashboard/books?universeUpdated=true');
            },
            error: (errorData) => {
                this.loader.deactivateLoader();
                this._snackBar.openSnackBar(errorData, 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }
}
