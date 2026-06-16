import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { Character } from '../../../../interfaces/character';
import { BookService } from '../../../../services/entities/book.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    standalone: true,
    selector:  'app-character',
    imports: [MatIconModule, CommonModule],
    templateUrl: './character.component.html',
    styleUrl: './character.component.sass'
})
export class CharacterComponent implements OnInit, OnDestroy {
    book: Book | null = null;
    character: Character | null = null;
    isCreationRoute = false;

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private bookSrv: BookService,
        private loader: LoaderEmmitterService
    ) { }

    ngOnInit(): void {
        this.loader.activateLoader();
        this.route.params.subscribe((params) => {
            const bookId = Number(params['id']);
            const characterId = Number(params['crid']);
            this.isCreationRoute = !characterId;

            this.bookSrv.getBook(bookId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (book: Book) => {
                        this.book = book;
                        this.character = characterId ? book.Personajes.find(c => c.Id === characterId) ?? null : null;
                        this.loader.deactivateLoader();
                    },
                    error: () => {
                        this.book = null;
                        this.character = null;
                        this.loader.deactivateLoader();
                    }
                });
        });
    }

    getStatusName(status: Character['Estados'][number]): string {
        return status.Estado?.Nombre ?? '';
    }

    getRelativeName(relation: Character['Relaciones'][number]): string {
        return relation.Relativo?.Nombre ?? '';
    }

    get hasAliases(): boolean {
        return !!this.character?.Apodos?.length;
    }

    get hasEntries(): boolean {
        return !!this.character?.Entradas?.length;
    }

    get hasStatuses(): boolean {
        return !!this.character?.Estados?.length;
    }

    get hasRelations(): boolean {
        return !!this.character?.Relaciones?.length;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
