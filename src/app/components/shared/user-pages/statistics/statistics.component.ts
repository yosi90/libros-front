import { Component, ElementRef, OnInit } from '@angular/core';
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
import { CommonModule } from '@angular/common';
import { BookStale, FastRead, IdNameMetric, MonthlyCount, ReadingStatusDistribution, monthlyCountLabel, totalReadDays } from '../../../../interfaces/statistics';
import { MatIconModule } from '@angular/material/icon';
import { readingStatusOptions } from '../../../../shared/reading-status';

@Component({
    selector: 'app-statistics',
    standalone: true,
    imports: [NgApexchartsModule, CommonModule, MatIconModule],
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.sass']
})
export class StatisticsComponent implements OnInit {
    public chartsReady = false;

    // Variables para estadísticas
    librosLeidos = 0;
    librosNoLeidos = 0;
    antologiasLeidas = 0;
    antologiasNoLeidas = 0;
    seccionesAntologiaLeidas = 0;
    libroMasRapido: FastRead | null = null;
    libroMasTiempoSinLeer: BookStale | null = null;
    librosPorComprar: IdNameMetric[] = [];
    averageReadingTime: number | null = null;
    hasReadingDistributionData = false;
    hasFastestReadBooksData = false;
    hasReadingHistoryData = false;

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
        private hostRef: ElementRef<HTMLElement>
    ) { }

    ngOnInit(): void {
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

            this.actualizarChart(results.DistribucionEstados);
            this.configurarFastestBooksChart(results.TopLibrosMasRapidos);
            this.configurarReadingHistoryChart(results.HistorialLectura);
            this.hasReadingDistributionData = results.DistribucionEstados.some(status => status.Total > 0);
            this.hasFastestReadBooksData = results.TopLibrosMasRapidos.some(book => (totalReadDays(book) ?? 0) > 0);
            this.hasReadingHistoryData = results.HistorialLectura.some(month => month.cantidad > 0);
            this.chartsReady = true;
        });
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
            colors: ['#d9a956', '#4f9d9a', '#78bf68', '#c9c0ad', '#d9a956', '#b85f58']
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
            chart: { type: 'line', height: 330, toolbar: { show: false }, foreColor: '#d8c3a2' },
            stroke: { width: 4, curve: 'straight' },
            markers: { size: 5 },
            xaxis: { categories, title: { text: 'Mes/Año' } },
            yaxis: { title: { text: 'Cantidad de libros' } },
            title: { text: '', align: 'center' },
            colors: ['#d9a956']
        };
    }

}
