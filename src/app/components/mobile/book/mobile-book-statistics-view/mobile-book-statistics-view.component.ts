import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ChapterStatistic, CharacterBookStatistic } from '../../../../interfaces/statistics';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';

@Component({
    selector: 'app-mobile-book-statistics-view',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './mobile-book-statistics-view.component.html',
    styleUrl: './mobile-book-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookStatisticsViewComponent {
    @Input({ required: true }) controller!: BookStatisticsComponent;

    get pageRows(): ChapterStatistic[] {
        return [...(this.controller.snapshot?.Capitulos ?? [])].filter(row => row.PaginasEstimadas !== null).sort((a, b) => (b.PaginasEstimadas ?? 0) - (a.PaginasEstimadas ?? 0)).slice(0, 10);
    }

    get characterRows(): CharacterBookStatistic[] {
        return [...(this.controller.snapshot?.Personajes ?? [])].sort((a, b) => b.Total - a.Total).slice(0, 10);
    }

    get chapterCharacterRows(): ChapterStatistic[] {
        return [...(this.controller.snapshot?.Capitulos ?? [])]
            .sort((a, b) => (b.PersonajesPresentes + b.PersonajesNombrados) - (a.PersonajesPresentes + a.PersonajesNombrados))
            .slice(0, 10);
    }

    maxPage(): number { return Math.max(1, ...this.pageRows.map(row => row.PaginasEstimadas ?? 0)); }
    maxCharacter(): number { return Math.max(1, ...this.characterRows.map(row => row.Total)); }
    maxChapterCharacter(): number { return Math.max(1, ...this.chapterCharacterRows.map(row => row.PersonajesPresentes + row.PersonajesNombrados)); }

    savePurchaseDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (!value) return;
        this.controller.purchaseDate.setValue(new Date(`${value}T00:00:00`));
        this.controller.savePurchaseDate();
    }
}
