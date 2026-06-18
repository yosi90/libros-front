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
import { BookStale, FastRead, IdNameMetric, MonthlyCount, monthlyCountLabel, totalReadDays } from '../../../../interfaces/statistics';
import { MatIconModule } from '@angular/material/icon';

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

            this.actualizarChart(results.LibrosNoLeidos);
            this.configurarFastestBooksChart(results.TopLibrosMasRapidos);
            this.configurarReadingHistoryChart(results.HistorialLectura);
            this.hasReadingDistributionData = [results.LibrosLeidos, results.AntologiasLeidas, results.LibrosNoLeidos].some(value => value > 0);
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

    actualizarChart(librosNoLeidos: number) {
        this.chartOptions = {
            series: [this.librosLeidos, this.antologiasLeidas, librosNoLeidos],
            chart: {
                type: 'donut',
                height: 330,
                toolbar: { show: false },
                foreColor: '#2b211a'
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
                                color: '#2b211a'
                            }
                        }
                    }
                }
            },
            labels: ['Libros leídos', 'Antologías leídas', 'Libros no leídos'],
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 320 },
                    legend: { position: 'bottom' }
                }
            }],
            colors: ['#1592d1', '#21a67a', '#f4ad24']
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
                foreColor: '#2b211a'
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
            colors: ['#168bd1']
        };
    }

    configurarReadingHistoryChart(data: MonthlyCount[]) {
        const categories = data.map(monthlyCountLabel);
        const cantidades = data.map(d => d.cantidad);

        this.readingHistoryChartOptions = {
            series: [{ name: 'Libros leídos', data: cantidades }],
            chart: { type: 'line', height: 330, toolbar: { show: false }, foreColor: '#2b211a' },
            stroke: { width: 4, curve: 'straight' },
            markers: { size: 5 },
            xaxis: { categories, title: { text: 'Mes/Año' } },
            yaxis: { title: { text: 'Cantidad de libros' } },
            title: { text: '', align: 'center' },
            colors: ['#168bd1']
        };
    }

}
