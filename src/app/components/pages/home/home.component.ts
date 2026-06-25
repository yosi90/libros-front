import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';

@Component({
    standalone: true,
    selector:  'app-home',
    imports: [MatCardModule, RouterLink, MatDividerModule, MatIconModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.sass'
})
export class HomeComponent {

    readingQuote: ReadingQuote = getRandomReadingQuote();
}
