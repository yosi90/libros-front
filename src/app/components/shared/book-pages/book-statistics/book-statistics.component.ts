import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
    ApexAxisChartSeries,
    ApexChart,
    ApexDataLabels,
    ApexLegend,
    ApexPlotOptions,
    ApexStroke,
    ApexXAxis,
    ApexYAxis,
    NgApexchartsModule
} from 'ng-apexcharts';
import { Subject, takeUntil } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { ChapterStatistic, CharacterBookStatistic, BookStatisticsSnapshot } from '../../../../interfaces/statistics';
import { StatisticsService } from '../../../../services/other/statistics.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';

interface BookChartOptions {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    plotOptions: ApexPlotOptions;
    dataLabels: ApexDataLabels;
    stroke?: ApexStroke;
    legend: ApexLegend;
    colors: string[];
}

@Component({
    standalone: true,
    selector: 'app-book-statistics',
    imports: [CommonModule, MatIconModule, NgApexchartsModule],
    templateUrl: './book-statistics.component.html',
    styleUrl: './book-statistics.component.sass'
})
export class BookStatisticsComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    readonly chartItemLimit = 20;

    book: Book = this.bookStore.libroVacio;
    snapshot: BookStatisticsSnapshot | null = null;
    pageChartOptions: BookChartOptions = this.createEmptyChartOptions('bar');
    chapterCharacterChartOptions: BookChartOptions = this.createEmptyChartOptions('bar', true);
    topCharacterChartOptions: BookChartOptions = this.createEmptyChartOptions('bar', true);
    topChapter: ChapterStatistic | null = null;
    mostMentionedCharacter: CharacterBookStatistic | null = null;
    mostFrequentCharacter: CharacterBookStatistic | null = null;
    hasPageData = false;
    hasChapterCharacterData = false;
    hasTopCharacterData = false;
    pageChartLimited = false;
    chapterCharacterChartLimited = false;

    constructor(
        private bookStore: BookStoreService,
        private statisticsSrv: StatisticsService
    ) { }

    ngOnInit(): void {
        this.bookStore.book$
            .pipe(takeUntil(this.destroy$))
            .subscribe(book => {
                this.book = book;
                this.snapshot = book.Id ? this.statisticsSrv.getBookStatisticsFromBook(book) : null;
                this.rebuildView();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get totalChapters(): number {
        return this.snapshot?.Capitulos.length ?? 0;
    }

    get totalScenes(): number {
        return this.snapshot?.Capitulos.reduce((total, chapter) => total + chapter.Escenas, 0) ?? 0;
    }

    get totalPresentCharacters(): number {
        return this.snapshot?.Capitulos.reduce((total, chapter) => total + chapter.PersonajesPresentes, 0) ?? 0;
    }

    get totalMentionedCharacters(): number {
        return this.snapshot?.Capitulos.reduce((total, chapter) => total + chapter.PersonajesNombrados, 0) ?? 0;
    }

    get averagePagesByChapter(): number | null {
        const pages = this.snapshot?.Capitulos
            .map(chapter => chapter.PaginasEstimadas)
            .filter((pages): pages is number => pages !== null) ?? [];

        if (pages.length === 0) {
            return null;
        }

        return pages.reduce((total, page) => total + page, 0) / pages.length;
    }

    get startedDate(): string | null {
        return this.findStatusDate('comenz');
    }

    get finishedDate(): string | null {
        return this.findStatusDate('leido') ?? this.findStatusDate('leído');
    }

    get boughtDate(): string | null {
        return this.findStatusDate('compr');
    }

    private rebuildView(): void {
        if (!this.snapshot) {
            this.pageChartOptions = this.createEmptyChartOptions('bar');
            this.chapterCharacterChartOptions = this.createEmptyChartOptions('bar', true);
            this.topCharacterChartOptions = this.createEmptyChartOptions('bar', true);
            this.topChapter = null;
            this.mostMentionedCharacter = null;
            this.mostFrequentCharacter = null;
            this.hasPageData = false;
            this.hasChapterCharacterData = false;
            this.hasTopCharacterData = false;
            this.pageChartLimited = false;
            this.chapterCharacterChartLimited = false;
            return;
        }

        const knownPageChapters = this.snapshot.Capitulos.filter(chapter => chapter.PaginasEstimadas !== null);
        const limitedPageChapters = knownPageChapters.slice(0, this.chartItemLimit);
        const limitedCharacterChapters = [...this.snapshot.Capitulos]
            .sort((current, next) => this.totalCharactersInChapter(next) - this.totalCharactersInChapter(current))
            .slice(0, this.chartItemLimit)
            .sort((current, next) => current.Orden - next.Orden);
        const topCharacters = [...this.snapshot.Personajes]
            .sort((current, next) => next.Total - current.Total)
            .slice(0, 10);

        this.pageChartOptions = this.createPageChartOptions(limitedPageChapters);
        this.chapterCharacterChartOptions = this.createChapterCharacterChartOptions(limitedCharacterChapters);
        this.topCharacterChartOptions = this.createTopCharacterChartOptions(topCharacters);
        this.hasPageData = knownPageChapters.some(chapter => (chapter.PaginasEstimadas ?? 0) > 0);
        this.hasChapterCharacterData = this.snapshot.Capitulos.some(chapter => this.totalCharactersInChapter(chapter) > 0);
        this.hasTopCharacterData = topCharacters.some(character => character.Total > 0);
        this.pageChartLimited = knownPageChapters.length > this.chartItemLimit;
        this.chapterCharacterChartLimited = this.snapshot.Capitulos.length > this.chartItemLimit;

        this.topChapter = [...this.snapshot.Capitulos]
            .sort((current, next) => this.totalCharactersInChapter(next) - this.totalCharactersInChapter(current))[0] ?? null;

        this.mostMentionedCharacter = [...this.snapshot.Personajes]
            .sort((current, next) => next.Nombramientos - current.Nombramientos)[0] ?? null;

        this.mostFrequentCharacter = [...this.snapshot.Personajes]
            .sort((current, next) => next.Apariciones - current.Apariciones)[0] ?? null;
    }

    private totalCharactersInChapter(chapter: ChapterStatistic): number {
        return chapter.PersonajesPresentes + chapter.PersonajesNombrados;
    }

    private createPageChartOptions(chapters: ChapterStatistic[]): BookChartOptions {
        return {
            ...this.createEmptyChartOptions('bar'),
            series: [{ name: 'Páginas', data: chapters.map(chapter => chapter.PaginasEstimadas ?? 0) }],
            chart: { ...this.createBaseChart('bar'), height: 300 },
            xaxis: { categories: chapters.map(chapter => chapter.Nombre), labels: { rotate: -30, trim: true, style: { fontSize: '11px' } } },
            yaxis: { title: { text: 'Páginas estimadas', style: { color: '#d8c3a2' } }, labels: { style: { colors: '#d8c3a2' } } },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '48%' } },
            colors: ['#d9a956']
        };
    }

    private createChapterCharacterChartOptions(chapters: ChapterStatistic[]): BookChartOptions {
        return {
            ...this.createEmptyChartOptions('bar', true),
            series: [
                { name: 'Aparecen', data: chapters.map(chapter => chapter.PersonajesPresentes) },
                { name: 'Solo nombrados', data: chapters.map(chapter => chapter.PersonajesNombrados) }
            ],
            chart: { ...this.createBaseChart('bar'), stacked: true, height: this.calculateChartHeight(chapters.length) },
            xaxis: { categories: chapters.map(chapter => chapter.Nombre), title: { text: 'Registros de personajes', style: { color: '#d8c3a2' } }, labels: { style: { colors: '#d8c3a2' } } },
            yaxis: { labels: { style: { colors: '#d8c3a2' } } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '52%' } },
            legend: { show: true, position: 'top', labels: { colors: '#ead8bc' } },
            colors: ['#b9ea78', '#d9a956']
        };
    }

    private createTopCharacterChartOptions(characters: CharacterBookStatistic[]): BookChartOptions {
        return {
            ...this.createEmptyChartOptions('bar', true),
            series: [
                { name: 'Apariciones', data: characters.map(character => character.Apariciones) },
                { name: 'Nombramientos', data: characters.map(character => character.Nombramientos) }
            ],
            chart: { ...this.createBaseChart('bar'), stacked: true, height: this.calculateChartHeight(characters.length) },
            xaxis: { categories: characters.map(character => character.Nombre), title: { text: 'Registros', style: { color: '#d8c3a2' } }, labels: { style: { colors: '#d8c3a2' } } },
            yaxis: { labels: { style: { colors: '#d8c3a2' } } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '52%' } },
            legend: { show: true, position: 'top', labels: { colors: '#ead8bc' } },
            colors: ['#b9ea78', '#d9a956']
        };
    }

    private createEmptyChartOptions(type: ApexChart['type'], horizontal = false): BookChartOptions {
        return {
            series: [],
            chart: this.createBaseChart(type),
            xaxis: { categories: [] },
            yaxis: {},
            plotOptions: { bar: { horizontal } },
            dataLabels: { enabled: false },
            stroke: { width: 2 },
            legend: { show: false },
            colors: []
        };
    }

    private createBaseChart(type: ApexChart['type']): ApexChart {
        return {
            type,
            height: 330,
            toolbar: { show: false },
            foreColor: '#d8c3a2',
            fontFamily: 'Arial, sans-serif'
        };
    }

    private calculateChartHeight(items: number): number {
        return Math.max(300, Math.min(430, items * 26 + 86));
    }

    private findStatusDate(fragment: string): string | null {
        return this.book.Estados
            .find(status => status.Nombre.toLocaleLowerCase().includes(fragment))
            ?.Fecha ?? null;
    }
}
