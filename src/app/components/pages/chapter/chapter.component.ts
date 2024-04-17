import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Book } from '../../../interfaces/book';
import { BookService } from '../../../services/book/book.service';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../../../services/auth/login.service';
import { Chapter } from '../../../interfaces/chapter';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-chapter',
  standalone: true,
  imports: [MatInputModule, MatButtonModule, MatIconModule, CommonModule],
  templateUrl: './chapter.component.html',
  styleUrl: './chapter.component.sass',
})
export class ChapterComponent implements OnInit {
  book?: Book;
  chapter?: Chapter = {
    chapterId: 0,
    name: '',
    order_in_book: 0,
    description: '',
    book_id: 0,
    characters: []
  };

  errorNameMessage = '';
  name = new FormControl('', [
    Validators.required,
    Validators.pattern('^[a-zA-Z]{3,15}'),
    Validators.minLength(3),
    Validators.maxLength(30),
  ]);
  errorOrderMessage = '';
  order = new FormControl('', [
    Validators.required,
    Validators.pattern('^[1-9]{1,2}'),
    Validators.min(0),
    Validators.max(99),
  ]);
  fgName = this.fBuild.group({
    name: this.name,
    order: this.order,
  });

  constructor(
    private route: ActivatedRoute,
    private loginSrv: LoginService,
    private router: Router,
    private fBuild: FormBuilder,
    private bookSrv: BookService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const bookId = params['id'];
      const token = this.loginSrv.token;
      if (token != null && token != '') {
        this.bookSrv.getBook(bookId, token).subscribe({
          next: async (book) => {
            if (book.ownerId == this.loginSrv.userId) this.book = book;
            else {
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
    console.log(this.chapter);
  }

  updateNameErrorMessage() {
    if (this.name.hasError('required'))
      this.errorNameMessage = 'El nombre no puede quedar vacio';
    else if (this.name.hasError('minlength'))
      this.errorNameMessage = 'Nombre demasiado corto';
    else if (this.name.hasError('maxlength'))
      this.errorNameMessage = 'Nombre demasiado largo';
    else this.errorNameMessage = 'Nombre no válido';
  }

  updateOrderErrorMessage() {
    if (this.order.hasError('required'))
      this.errorOrderMessage = 'El orden no puede quedar vacio';
    else if (this.order.hasError('min'))
      this.errorOrderMessage = 'El orden no puede ser menor que cero';
    else if (this.order.hasError('max'))
      this.errorOrderMessage = 'El orden máximo es 99';
    else this.errorOrderMessage = 'Orden no válido';
  }
}
