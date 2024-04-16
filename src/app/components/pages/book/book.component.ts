import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookService } from '../../../services/book/book.service';
import { LoginService } from '../../../services/auth/login.service';
import { Book } from '../../../interfaces/book';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BookRouterComponent } from '../../book-router/book-router.component';

@Component({
    selector: 'app-book',
    standalone: true,
    imports: [ MatCardModule, MatIconModule, MatButtonModule, BookRouterComponent],
    templateUrl: './book.component.html',
    styleUrl: './book.component.sass'
})
export class BookComponent implements OnInit {

    book?: Book;

    constructor(private route: ActivatedRoute, private router: Router, private loginSrv: LoginService, private bookSrv: BookService) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            const bookId = params['id'];
            const token = this.loginSrv.token;
            if (token != null && token != '') {
                this.bookSrv.getBook(bookId, token).subscribe({
                    next: async (book) => {
                        if (book.ownerId == this.loginSrv.userId)
                            this.book = book;
                        else{
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

    addChapter(): void {
        this.router.navigateByUrl(`/book/${this.book?.bookId}/chapter`);
        console.log('abrido');
    }

    openChapter(event: any): void {
        this.router.navigateByUrl(`/book/${this.book?.bookId}/chapter/${event.source.id}`);
    }
}
