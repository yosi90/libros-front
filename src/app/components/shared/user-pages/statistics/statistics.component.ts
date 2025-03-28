import { Component, OnInit } from '@angular/core';
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
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-statistics',
    standalone: true,
    imports: [NgApexchartsModule, CommonModule],
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.sass']
})
export class StatisticsComponent implements OnInit {
    public chartsReady = false;

    // Variables para estadísticas
    librosLeidos = 0;
    antologiasLeidas = 0;
    libroMasRapido: any = {};
    libroMasTiempoSinLeer: any = {};
    librosPorComprar: any[] = [];
    averageReadingTime = 0;

    // Configuración ApexCharts
    chartOptions: {
        series: ApexNonAxisChartSeries,
        chart: ApexChart,
        responsive: ApexResponsive[],
        labels: string[],
        plotOptions?: ApexPlotOptions
    } = {
            series: [],
            chart: {
                type: 'donut',
                height: 350
            },
            labels: [],
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
    } = {
            series: [],
            chart: { type: 'bar', height: 350 },
            plotOptions: { bar: { horizontal: true } },
            dataLabels: { enabled: false },
            xaxis: { categories: [] },
            title: { text: '', align: 'center' }
        };

    readingHistoryChartOptions: any;
    averageReadingTimeChartOptions: any;

    constructor(private statsSrv: StatisticsService) { }

    ngOnInit(): void {
        forkJoin({
            librosLeidos: this.statsSrv.getReadBooks(),
            antologiasLeidas: this.statsSrv.getReadAntologies(),
            librosNoLeidos: this.statsSrv.getUnreadBooks(),
            libroMasRapido: this.statsSrv.getFastestReadBook(),
            libroMasTiempoSinLeer: this.statsSrv.getBookLongestUnread(),
            librosPorComprar: this.statsSrv.getBooksPendingPurchase(),
            fastestReadBooks: this.statsSrv.getFastestReadBooks(),
            readingHistory: this.statsSrv.getReadingHistory(),
            averageReadingTime: this.statsSrv.getAverageReadingTime()
        }).subscribe(results => {
            this.librosLeidos = results.librosLeidos.libros_leidos;
            this.antologiasLeidas = results.antologiasLeidas.antologias_leidas;
            const librosNoLeidos = results.librosNoLeidos.libros_no_leidos;
            this.libroMasRapido = results.libroMasRapido;
            this.libroMasTiempoSinLeer = results.libroMasTiempoSinLeer;
            this.librosPorComprar = results.librosPorComprar;
            this.averageReadingTime = results.averageReadingTime.promedio_dias;

            this.actualizarChart(librosNoLeidos);
            this.configurarFastestBooksChart(results.fastestReadBooks);
            this.configurarReadingHistoryChart(results.readingHistory);
            this.configurarAverageReadingTimeChart(this.averageReadingTime);
            this.chartsReady = true;
        });
    }

    actualizarChart(librosNoLeidos: number) {
        this.chartOptions = {
            series: [this.librosLeidos, this.antologiasLeidas, librosNoLeidos],
            chart: {
                type: 'donut',
                height: 350
            },
            labels: ['Libros leídos', 'Antologías leídas', 'Libros no leídos'],
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 320 },
                    legend: { position: 'bottom' }
                }
            }]
        };
    }

    configurarFastestBooksChart(data: any[]) {
        this.fastestReadBooksChartOptions = {
            series: [{
                name: 'Tiempo en días',
                data: data.map(libro => libro.TiempoLectura.Dias + libro.TiempoLectura.Horas / 24)
            }],
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    horizontal: true
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val) => `${(+val).toFixed(1)} días`
            },
            xaxis: {
                categories: data.map(libro => libro.Nombre),
                title: { text: 'Tiempo de Lectura (días)' }
            },
            title: {
                text: 'Top 5 libros leídos más rápido',
                align: 'center'
            }
        };
    }

    configurarReadingHistoryChart(data: any[]) {
        const categories = data.map(d => `${d.mes}/${d.anio}`);
        const cantidades = data.map(d => d.cantidad);
    
        this.readingHistoryChartOptions = {
            series: [{ name: 'Libros leídos', data: cantidades }],
            chart: { type: 'line', height: 350 },
            xaxis: { categories, title: { text: 'Mes/Año' } },
            yaxis: { title: { text: 'Cantidad de libros' } },
            title: { text: 'Libros leídos por mes', align: 'center' }
        };
    }

    configurarAverageReadingTimeChart(promedioDias: number) {
        this.averageReadingTimeChartOptions = {
            series: [promedioDias],
            chart: {
                height: 350,
                type: 'radialBar'
            },
            plotOptions: {
                radialBar: {
                    hollow: {
                        size: '70%',
                    },
                    dataLabels: {
                        name: {
                            show: true,
                            fontSize: '18px',
                        },
                        value: {
                            fontSize: '20px',
                            formatter: (val: number) => `${val} días`
                        }
                    }
                }
            },
            labels: ['Tiempo Promedio de lectura']
        };
    }
}
