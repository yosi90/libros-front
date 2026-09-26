import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ChapterStatistic, CharacterBookStatistic } from '../../../../interfaces/statistics';
import { chapterCharacterTotal, rankingMax, topChapterCharacterRows, topCharacterRows, topPageRows } from '../../../../shared/book-statistics-rankings';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';

/** Resumen Web del libro: cifras, recorrido de lectura, personajes y clasificaciones. */
@Component({
    selector: 'app-web-book-statistics-view',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './web-book-statistics-view.component.html',
    styleUrl: './web-book-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookStatisticsViewComponent {
    @Input({ required: true }) controller!: BookStatisticsComponent;

    get c(): BookStatisticsComponent { return this.controller; }

    get pageRows(): ChapterStatistic[] { return topPageRows(this.c.snapshot); }
    get characterRows(): CharacterBookStatistic[] { return topCharacterRows(this.c.snapshot); }
    get chapterCharacterRows(): ChapterStatistic[] { return topChapterCharacterRows(this.c.snapshot); }

    maxPage(): number { return rankingMax(this.pageRows.map(row => row.PaginasEstimadas ?? 0)); }
    maxCharacter(): number { return rankingMax(this.characterRows.map(row => row.Total)); }
    maxChapterCharacter(): number { return rankingMax(this.chapterCharacterRows.map(chapterCharacterTotal)); }
    chapterCharacters(row: ChapterStatistic): number { return chapterCharacterTotal(row); }

    savePurchaseDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (!value) return;
        this.c.purchaseDate.setValue(new Date(`${value}T00:00:00`));
        this.c.savePurchaseDate();
    }
}
