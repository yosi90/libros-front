import { WebStatisticsViewComponent } from '../../../web/user/web-statistics-view/web-statistics-view.component';
import { integerAxisScale } from '../../../../shared/chart-axis';
import { Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {
    ApexChart,
    ApexNonAxisChartSeries,
    ApexResponsive,
    ApexPlotOptions,
    ApexAxisChartSeries,
    ApexXAxis,
    ApexDataLabels,
    ApexTitleSubtitle,
    NgApexchartsModule
} from 'ng-apexcharts';
import { StatisticsService } from '../../../../services/other/statistics.service';

import { BookStale, FastRead, IdNameMetric, MonthlyCount, ReadingStatusDistribution, monthlyCountLabel, totalReadDays } from '../../../../interfaces/statistics';
import { MatIconModule } from '@angular/material/icon';
import { readingStatusOptions } from '../../../../shared/reading-status';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileStatisticsViewComponent } from '../../../mobile/user/mobile-statistics-view/mobile-statistics-view.component';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { StatRowsComponent } from '../../common/stat-rows/stat-rows.component';
import {
    StatRow, catalogByDecade, catalogByLanguage, catalogByStyle, catalogTopAuthors, communityBookRows, communityClubRows, communityRatedRows,
    communityReadingRows, longestWaiting, ratingDistribution, readStyles, topReadAuthors
} from '../../../../shared/library-stats';
import { CatalogItem } from '../../../../interfaces/catalog';
import { CommunityActivity30Days, CommunityStatistics } from '../../../../interfaces/statistics';
import { catchError, forkJoin, of } from 'rxjs';

export type StatisticsTab = 'personal' | 'general';

@Component({
    selector: 'app-statistics',
    standalone: true,
    imports: [NgApexchartsModule, MatIconModule, MobileStatisticsViewComponent, WebStatisticsViewComponent, StatRowsComponent],
    templateUrl: './statistics.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./statistics.component.sass']
})
export class StatisticsComponent implements OnInit {
    public chartsReady = false;
    public chartLibraryAvailable = false;
    public loadError = '';
    /** Ninguna métrica cargó: las vistas muestran un estado de error, no «sin datos». */
    public unavailable = false;
    private readonly chartLibrary = import('apexcharts').then(() => true).catch(() => false);

    // Variables para estadísticas
    librosLeidos: number | null = 0;
    librosNoLeidos: number | null = 0;
    antologiasLeidas: number | null = 0;
    antologiasNoLeidas: number | null = 0;
    seccionesAntologiaLeidas: number | null = 0;
    libroMasRapido: FastRead | null = null;
    libroMasTiempoSinLeer: BookStale | null = null;
    librosPorComprar: IdNameMetric[] = [];
    averageReadingTime: number | null = null;
    hasReadingDistributionData = false;
    hasFastestReadBooksData = false;
    hasReadingHistoryData = false;

    /** Pestañas: lo tuyo (colección) y lo de todos (catálogo). */
    tab: StatisticsTab = 'personal';
    waitingBooks: StatRow[] = [];
    readAuthors: StatRow[] = [];
    stylesRead: StatRow[] = [];
    ratings: StatRow[] = [];

    generalLoaded = false;
    generalLoading = false;
    generalError = false;
    catalogTitles = 0;
    catalogAuthorCount = 0;
    catalogStyles: StatRow[] = [];
    catalogAuthors: StatRow[] = [];
    catalogLanguages: StatRow[] = [];
    catalogDecades: StatRow[] = [];

    /** Agregados de la comunidad; null si el servidor no respondió. */
    community: CommunityStatistics | null = null;
    communityError = false;
    communityStyles: StatRow[] = [];
    communityAuthors: StatRow[] = [];
    communityLanguages: StatRow[] = [];
    communitySagas: StatRow[] = [];
    communityUniverses: StatRow[] = [];
    communityBooks: StatRow[] = [];
    communityTopRated: StatRow[] = [];
    communityAnthologies: StatRow[] = [];
    /** Doce meses; null en un mes = pocas personas (privacidad), no cero. */
    communityMonthly: Array<{ label: string; value: number | null }> = [];
    communityBiggestClubs: StatRow[] = [];
    communityActiveClubs: StatRow[] = [];
    readonly activityLabels: Array<{ key: keyof CommunityActivity30Days; label: string; icon: string }> = [
        { key: 'Publicaciones', label: 'Publicaciones', icon: 'article' },
        { key: 'Comentarios', label: 'Comentarios', icon: 'chat_bubble' },
        { key: 'Reacciones', label: 'Reacciones', icon: 'favorite' },
        { key: 'Debates', label: 'Debates', icon: 'forum' },
        { key: 'VotosEncuesta', label: 'Votos', icon: 'how_to_vote' },
        { key: 'Eventos', label: 'Eventos', icon: 'event' },
        { key: 'NuevosMiembros', label: 'Nuevos miembros', icon: 'group_add' }
    ];

    /** Rankings de la comunidad con datos (Mobile/APK y Wood); la privacidad deja vacíos los pequeños. */
    get communityRankings(): Array<{ title: string; icon: string; rows: StatRow[] }> {
        return [
            { title: 'Libros más leídos', icon: 'menu_book', rows: this.communityBooks },
            { title: 'Mejor valorados', icon: 'star', rows: this.communityTopRated },
            { title: 'Estilos más leídos', icon: 'palette', rows: this.communityStyles },
            { title: 'Autores más leídos', icon: 'person_search', rows: this.communityAuthors },
            { title: 'Idiomas más leídos', icon: 'translate', rows: this.communityLanguages },
            { title: 'Sagas más leídas', icon: 'collections_bookmark', rows: this.communitySagas },
            { title: 'Universos más leídos', icon: 'public', rows: this.communityUniverses },
            { title: 'Antologías más leídas', icon: 'library_books', rows: this.communityAnthologies }
        ].filter(ranking => ranking.rows.length);
    }

    /** Meses con dato, como filas (Mobile/APK y Wood). */
    get communityMonthlyRows(): StatRow[] {
        return this.communityMonthly.filter(month => month.value !== null).map(month => ({ label: month.label, value: month.value as number }));
    }

    get hasCommunityMonthly(): boolean {
        return this.communityMonthly.some(month => month.value !== null && month.value > 0);
    }

    // Configuración ApexCharts
    chartOptions: {
        series: ApexNonAxisChartSeries,
        chart: ApexChart,
        responsive: ApexResponsive[],
        labels: string[],
        plotOptions: ApexPlotOptions,
        colors: string[]
    } = {
            series: [],
            chart: {
                type: 'donut',
                height: 350
            },
            labels: [],
            plotOptions: {},
            colors: [],
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 320 },
                    legend: { position: 'bottom' }
                }
            }]
        };

    fastestReadBooksChartOptions: {
        series: ApexAxisChartSeries;
        chart: ApexChart;
        xaxis: ApexXAxis;
        plotOptions: ApexPlotOptions;
        dataLabels: ApexDataLabels;
        title: ApexTitleSubtitle;
        colors: string[];
    } = {
            series: [],
            chart: { type: 'bar', height: 350 },
            plotOptions: { bar: { horizontal: true } },
            dataLabels: { enabled: false },
            xaxis: { categories: [] },
            title: { text: '', align: 'center' },
            colors: []
        };

    readingHistoryChartOptions: any;

    constructor(
        private statsSrv: StatisticsService,
        private hostRef: ElementRef<HTMLElement>,
        private presentation: PresentationModeService,
        private catalog: CatalogService
    ) { }

    setTab(tab: StatisticsTab): void {
        this.tab = tab;
        if (tab === 'general' && !this.generalLoaded && !this.generalLoading) this.loadGeneral();
    }

    loadGeneral(): void {
        this.generalLoading = true;
        this.generalError = false;
        // Catálogo y comunidad por separado: si uno falla, el otro se muestra igual.
        forkJoin({
            items: this.catalog.getBooks().pipe(catchError(() => of(null as CatalogItem[] | null))),
            community: this.statsSrv.getCommunityStatistics().pipe(catchError(() => of(null as CommunityStatistics | null)))
        }).subscribe(({ items, community }) => {
            if (items) this.applyCatalog(items);
            this.applyCommunity(community);
            this.generalError = !items && !community;
            this.generalLoaded = !this.generalError;
            this.generalLoading = false;
        });
    }

    private applyCatalog(items: CatalogItem[]): void {
        this.catalogTitles = items.length;
        this.catalogAuthorCount = new Set(items.flatMap(item => (item.Autores ?? []).map(author => author.Id))).size;
        this.catalogStyles = catalogByStyle(items);
        this.catalogAuthors = catalogTopAuthors(items);
        this.catalogLanguages = catalogByLanguage(items);
        this.catalogDecades = catalogByDecade(items);
    }

    private applyCommunity(community: CommunityStatistics | null): void {
        this.community = community;
        this.communityError = !community;
        if (!community) return;
        this.communityStyles = communityReadingRows(community.EstilosMasLeidos ?? []);
        this.communityAuthors = communityReadingRows(community.AutoresMasLeidos ?? []);
        this.communityLanguages = communityReadingRows(community.IdiomasMasLeidos ?? []);
        this.communitySagas = communityReadingRows(community.SagasMasLeidas ?? []);
        this.communityUniverses = communityReadingRows(community.UniversosMasLeidos ?? []);
        this.communityBooks = communityBookRows(community.LibrosMasLeidos ?? []);
        this.communityTopRated = communityRatedRows(community.MejorValorados ?? []);
        this.communityAnthologies = communityBookRows(community.AntologiasMasLeidas ?? []);
        this.communityMonthly = (community.LecturasPorMes ?? []).map(month => ({
            label: monthlyCountLabel({ anio: month.Anio, mes: month.Mes, cantidad: month.Cantidad ?? 0 }),
            value: month.Cantidad
        }));
        this.communityBiggestClubs = communityClubRows(community.ClubesMasAmplios ?? []);
        this.communityActiveClubs = communityClubRows(community.ClubesMasActivos ?? [], true);
    }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get isWebPresentation(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    get mobileController(): this { return this; }

    ngOnInit(): void {
        this.load();
    }

    retry(): void {
        this.chartsReady = false;
        this.load();
    }

    private load(): void {
        this.loadError = '';
        this.unavailable = false;
        this.statsSrv.getGlobalStatistics().subscribe(results => {
            this.librosLeidos = results.LibrosLeidos;
            this.librosNoLeidos = results.LibrosNoLeidos;
            this.antologiasLeidas = results.AntologiasLeidas;
            this.antologiasNoLeidas = results.AntologiasNoLeidas;
            this.seccionesAntologiaLeidas = results.SeccionesAntologiaLeidas;
            this.libroMasRapido = results.LibroMasRapido;
            this.libroMasTiempoSinLeer = results.LibroMasTiempoSinLeer;
            this.librosPorComprar = results.LibrosPorComprar;
            this.averageReadingTime = results.PromedioDiasCompraLectura;
            this.waitingBooks = longestWaiting(results.Coleccion);
            this.readAuthors = topReadAuthors(results.Coleccion);
            this.stylesRead = readStyles(results.Coleccion);
            this.ratings = ratingDistribution(results.Coleccion);

            this.actualizarChart(results.DistribucionEstados);
            this.configurarFastestBooksChart(results.TopLibrosMasRapidos);
            this.configurarReadingHistoryChart(results.HistorialLectura);
            this.hasReadingDistributionData = results.DistribucionEstados.some(status => status.Total > 0);
            this.hasFastestReadBooksData = results.TopLibrosMasRapidos.some(book => (totalReadDays(book) ?? 0) > 0);
            this.hasReadingHistoryData = results.HistorialLectura.some(month => month.cantidad > 0);
            this.loadError = this.metricsErrorMessage(results.MetricasNoDisponibles, results.MetricasSolicitadas);
            this.unavailable = results.MetricasSolicitadas > 0 && results.MetricasNoDisponibles >= results.MetricasSolicitadas;
            void this.chartLibrary.then(available => {
                this.chartLibraryAvailable = available;
                if (!available)
                    this.loadError = 'No se ha podido cargar el motor de gráficos.';
                this.chartsReady = true;
            });
        }, () => {
            this.loadError = 'No se han podido cargar las estadísticas.';
            this.unavailable = true;
            this.chartsReady = true;
        });
    }

    private metricsErrorMessage(unavailable: number, requested: number): string {
        if (unavailable === 0)
            return '';
        return unavailable >= requested
            ? 'No se han podido cargar las estadísticas.'
            : 'Algunas estadísticas no están disponibles ahora mismo. El resto está actualizado.';
    }

    scrollToPendingBooks(pendingBooksPanel: HTMLElement): void {
        const scrollRoot = this.hostRef.nativeElement;
        const targetTop = pendingBooksPanel.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top + scrollRoot.scrollTop;

        scrollRoot.scrollTo({ top: targetTop, behavior: 'smooth' });
    }

    actualizarChart(distribution: ReadingStatusDistribution[]): void {
        const totals = new Map(distribution.map(status => [status.EstadoId, status.Total]));

        this.chartOptions = {
            series: readingStatusOptions.map(status => totals.get(status.Id) ?? 0),
            chart: {
                type: 'donut',
                height: 330,
                width: '100%',
                toolbar: { show: false },
                foreColor: '#d8c3a2'
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '62%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                color: '#d8c3a2'
                            }
                        }
                    }
                }
            },
            labels: readingStatusOptions.map(status => status.Nombre),
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 320 },
                    legend: { position: 'bottom' }
                }
            }],
            colors: ['#d9a956', '#4f9d9a', '#78bf68', '#c9c0ad', '#9b7bb8', '#b85f58']
        };
    }

    configurarFastestBooksChart(data: FastRead[]) {
        this.fastestReadBooksChartOptions = {
            series: [{
                name: 'Tiempo en días',
                data: data.map(libro => totalReadDays(libro) ?? 0)
            }],
            chart: {
                type: 'bar',
                height: 330,
                width: '100%',
                toolbar: { show: false },
                foreColor: '#d8c3a2'
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                    barHeight: '58%'
                }
            },
            dataLabels: {
                enabled: true,
                style: { colors: ['#ffffff'] },
                formatter: (val) => `${(+val).toFixed(1)} días`
            },
            xaxis: {
                categories: data.map(libro => libro.Nombre),
                title: { text: 'Tiempo de Lectura (días)' }
            },
            title: {
                text: '',
                align: 'center'
            },
            colors: ['#d9a956']
        };
    }

    configurarReadingHistoryChart(data: MonthlyCount[]) {
        const categories = data.map(monthlyCountLabel);
        const cantidades = data.map(d => d.cantidad);

        this.readingHistoryChartOptions = {
            series: [{ name: 'Libros leídos', data: cantidades }],
            chart: { type: 'line', height: 330, width: '100%', toolbar: { show: false }, foreColor: '#d8c3a2' },
            stroke: { width: 4, curve: 'straight' },
            markers: { size: 5 },
            xaxis: { categories, title: { text: 'Mes/Año' } },
            yaxis: { ...integerAxisScale(Math.max(0, ...cantidades)), title: { text: 'Cantidad de libros' } },
            title: { text: '', align: 'center' },
            colors: ['#d9a956']
        };
    }

}
