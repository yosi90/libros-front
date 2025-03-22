import { CommonModule, AsyncPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, merge, startWith, map, Subject, switchMap, takeUntil } from 'rxjs';
import { Saga } from '../../../../interfaces/saga';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../../modules/used-text-validator.module';
import { SessionService } from '../../../../services/auth/session.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { SagaService } from '../../../../services/entities/saga.service';
import { Universe } from '../../../../interfaces/universe';
import { Author } from '../../../../interfaces/author';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';

@Component({
    selector: 'app-update-saga',
    standalone: true,
    imports: [MatCardModule, FormsModule, ReactiveFormsModule, MatInputModule, MatButtonModule, CommonModule, MatIconModule, customValidatorsModule,
        MatAutocompleteModule, AsyncPipe, MatSelectModule, SnackbarModule],
    templateUrl: './update-saga.component.html',
    styleUrl: './update-saga.component.sass'
})
export class UpdateSagaComponent implements OnInit, OnDestroy {
    universes: Universe[] = [];
    authors: Author[] = [];
    universoActual!: Universe;
    
    names: string[] = [];
    filteredUniverses!: Observable<string[]>;
    originalsaga!: Saga;
    actualSaga: Saga = {
        Id: 0,
        Nombre: '',
        Autores: [],
        Libros: [],
        Antologias: []
    };
    authorNames: string[] = [];

    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        this.customValidator.usedTextValidator(this.names)
    ]);
    errorUniverseMessage = '';
    universe = new FormControl('', [
        Validators.required
    ]);
    errorAuthorMessage = '';
    author = new FormControl([], [
        Validators.required
    ]);

    private destroy$ = new Subject<void>();

    constructor(private sagaSrv: SagaService, private router: Router, private fBuild: FormBuilder, private loader: LoaderEmmitterService,
        private _snackBar: SnackbarModule, private customValidator: customValidatorsModule, private route: ActivatedRoute, private universeStore: UniverseStoreService, private authorStore: AuthorStoreService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.universe.statusChanges, this.universe.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateUniverseErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
    }

    ngOnInit(): void {
        // this.loader.activateLoader();
        // this.route.params.pipe(
        //     switchMap(params => this.sagaSrv.getCreatedSaga(params['id']))
        // ).subscribe(saga => {
        //     if (!saga) {
        //         this.sessionSrv.logout();
        //         return;
        //     }
        //     this.originalsaga = saga;
        //     this.actualSaga = saga;
        //     this.authorNames = saga.authors.map(a => a.name);
        //     this.sessionSrv.user.pipe(takeUntil(this.destroy$)).subscribe(user => {
        //         this.userData = user;
        //         if (user.sagas) {
        //             this.names = user.sagas.map(a => a.name.toLocaleLowerCase());
        //             this.name = new FormControl(this.originalsaga.name, [
        //                 Validators.required,
        //                 Validators.minLength(3),
        //                 Validators.maxLength(50),
        //                 this.customValidator.usedTextValidator(this.names, this.originalsaga.name)
        //             ]);
        //             this.fgSaga = this.fBuild.group({
        //                 name: this.name,
        //                 universe: this.universe,
        //                 author: this.author
        //             });
        //         }
        //         this.filteredUniverses = this.universe.valueChanges.pipe(
        //             startWith(''),
        //             map(value => this._universeFilter(value || '')),
        //         );
        //         this.loader.deactivateLoader();
        //     });
        // });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    fgSaga = this.fBuild.group({
        name: this.name,
        universe: this.universe,
        author: this.author
    });

    private _universeFilter(value: string): string[] {
        const filterValue = value.toLowerCase();
        // return this.userData.universes.map(u => u.name).filter(option => option.toLowerCase().includes(filterValue));
        return [];
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Saga ya registrada';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateUniverseErrorMessage() {
        if (this.universe.hasError('required'))
            this.errorUniverseMessage = 'El universo no puede quedar vacío';
        else this.errorUniverseMessage = 'Universo no válido';
    }

    updateAuthorErrorMessage() {
        if (this.author.hasError('required'))
            this.errorAuthorMessage = 'El autor no puede quedar vacío';
        else this.errorAuthorMessage = 'Autor no válido';
    }

    addSaga(): void {
        // if (this.fgSaga.invalid) {
        //     this._snackBar.openSnackBar('Error: ' + this.fgSaga.errors, 'errorBar');
        //     return;
        // }
        // this.loader.activateLoader();
        // this.userData.universes.forEach(u => {
        //     if (this.actualSaga.universe.name === u.name){
        //         this.actualSaga.universe = u;
        //         this.actualSaga.universeId = u.universeId;
        //     }
        // });
        // this.actualSaga.authors = [];
        // this.userData.authors.forEach(a => {
        //     if (this.authorNames.includes(a.name))
        //         this.actualSaga.authors.push(a);
        // });
        // this.sagaSrv.updateSaga(this.actualSaga).subscribe({
        //     next: (saga) => {
        //         this.sessionSrv.forceUpdateUserData();
        //         this.fgSaga.reset();
        //         this.router.navigateByUrl('/dashboard/books?sagaUpdated=true');
        //     },
        //     error: (errorData) => {
        //         this.loader.deactivateLoader();
        //         this._snackBar.openSnackBar(errorData, 'errorBar');
        //     },
        //     complete: () => {
        //         this.loader.deactivateLoader();
        //     }
        // });
    }
}
