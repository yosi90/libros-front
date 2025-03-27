import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BookService } from '../../../../services/entities/book.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
import { Book } from '../../../../interfaces/book';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Author } from '../../../../interfaces/author';

@Component({
    standalone: true,
    selector:  'app-all-books',
    imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, CommonModule, FormsModule, MatCheckboxModule],
    templateUrl: './all-books.component.html',
    styleUrl: './all-books.component.sass'
})
export class AllBooksComponent {
    displayedColumns: string[] = ['bookId', 'name', 'isRead', 'authors', 'ownerId', 'chapters', 'characters'];
    dataSource!: MatTableDataSource<Book>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(private sessionSrv: SessionService, private bookSrv: BookService, private route: ActivatedRoute) {
        this.route.params.subscribe(() => {
            const token = this.sessionSrv.token;
            // this.bookSrv.getAllBooks(token).subscribe({
            //     next: async (books: Book[]) => {
            //         this.dataSource = new MatTableDataSource(books);
            //         this.dataSource.paginator = this.paginator;
            //         this.dataSource.sort = this.sort;
            //     },
            //     error: () => {
            //         this.sessionSrv.logout();
            //     },
            // });
        });
    }

    getAuthorNames(authors: Author[]): string {
        return authors.map(a => a.Nombre).join(' y ');
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    preventChange(event: Event) {
        event.preventDefault();
    }
}