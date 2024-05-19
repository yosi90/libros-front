import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from '../../../../services/entities/book.service';
import { SessionService } from '../../../../services/auth/session.service';
import { Book } from '../../../../interfaces/book';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BookRouterComponent } from '../../../book-router/book-router.component';
import { EmmittersService } from '../../../../services/emmitters.service';
import { Chapter } from '../../../../interfaces/chapter';
import { Character } from '../../../../interfaces/character';
import { environment } from '../../../../../environment/environment';
import { CommonModule } from '@angular/common';
import {MatSidenavModule} from '@angular/material/sidenav';

@Component({
    selector: 'app-book',
    standalone: true,
    imports: [MatCardModule, MatIconModule, MatButtonModule, BookRouterComponent, CommonModule, MatSidenavModule],
    templateUrl: './book.component.html',
    styleUrl: './book.component.sass'
})
export class BookComponent implements OnInit {
    imgUrl = environment.apiUrl;
    viewportSize!: { width: number, height: number };

    book: Book = {
        bookId: 0,
        name: '',
        status: {
            statusId: 0,
            name: ''
        },
        cover: '',
        userId: 0,
        authors: [],
        chapters: [],
        characters: [],
        orderInSaga: 0,
        universeId: 0,
        sagaId: 0
    };
    showChaps: boolean = true;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private route: ActivatedRoute, private router: Router, public loginSrv: SessionService, private bookSrv: BookService, private emmiterSrv: EmmittersService) {
        emmiterSrv.newChapter$.subscribe((chapter: Chapter) => {
            this.book.chapters.push(chapter);
        });
        emmiterSrv.newCharacter$.subscribe((character: Character) => {
            this.book.characters.push(character);
        });
        emmiterSrv.updatedChapter$.subscribe((updatedChapter: Chapter) => {
            const index = this.book.chapters.findIndex(chapter => chapter.chapterId === updatedChapter.chapterId);
            if (index !== -1)
                this.book.chapters.splice(index, 1, updatedChapter);
        });
        emmiterSrv.updatedCharacter$.subscribe((updatedCharacter: Character) => {
            const index = this.book.characters.findIndex(character => character.characterId === updatedCharacter.characterId);
            if (index !== -1)
                this.book.characters.splice(index, 1, updatedCharacter);
        });
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            const bookId = params['id'];
            const token = this.loginSrv.token;
            if (token != null && token != '') {
                this.bookSrv.getBook(bookId, token).subscribe({
                    next: async (book) => {
                        if (book.userId == this.loginSrv.userId)
                            this.book = book;
                        else
                            this.loginSrv.logout();
                    },
                    error: () => {
                        this.loginSrv.logout();
                    },
                });
            }
        });
    }
    
    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    addChapter(): void {
        this.router.navigate(['chapter'], { relativeTo: this.route });;
    }

    addCharacter(): void {
        this.router.navigate(['character'], { relativeTo: this.route });;
    }

    alternateList() {
        this.showChaps = !this.showChaps;
    }

    openChapter(event: any): void {
        this.router.navigateByUrl(`/book/${this.book?.bookId}/chapter/${event.target.id}`);
    }

    openCharacter(event: any): void {
        this.router.navigateByUrl(`/book/${this.book?.bookId}/character/${event.target.id}`);
    }
}
