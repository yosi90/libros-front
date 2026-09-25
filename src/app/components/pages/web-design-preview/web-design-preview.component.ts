import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

type WebPreviewScreen = 'library' | 'chapter' | 'profile';
type WebPreviewTheme = 'light' | 'dark';

const SCREENS = new Set<WebPreviewScreen>(['library', 'chapter', 'profile']);

interface PreviewBook {
    title: string;
    author: string;
    status: 'reading' | 'read' | 'waiting' | 'buy';
    progress: number;
    cover: [string, string];
}

interface PreviewSaga {
    name: string;
    author: string;
    books: PreviewBook[];
    open?: boolean;
}

interface PreviewGroup {
    name: string;
    author: string;
    count: number;
    progress: number;
    sagas: PreviewSaga[];
    open?: boolean;
}

// Laboratorio local de la presentación Web (Hito 0). Datos ficticios estáticos:
// no llama a la API ni consume fachadas reales.
@Component({
    selector: 'app-web-design-preview',
    standalone: true,
    imports: [MatIconModule, RouterLink],
    templateUrl: './web-design-preview.component.html',
    styleUrl: './web-design-preview.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebDesignPreviewComponent {
    readonly screen = signal<WebPreviewScreen>('library');
    readonly theme = signal<WebPreviewTheme>('light');
    readonly navCollapsed = signal(false);
    readonly drawerOpen = signal(false);

    readonly navigation = [
        { id: 'library', icon: 'auto_stories', label: 'Biblioteca' },
        { id: 'catalog', icon: 'travel_explore', label: 'Catálogo' },
        { id: 'community', icon: 'groups', label: 'Comunidad' },
        { id: 'messages', icon: 'forum', label: 'Mensajes', badge: 2 },
        { id: 'statistics', icon: 'insights', label: 'Estadísticas' }
    ];

    readonly statusLabels: Record<PreviewBook['status'], { label: string; icon: string }> = {
        reading: { label: 'En marcha', icon: 'menu_book' },
        read: { label: 'Leído', icon: 'check' },
        waiting: { label: 'En espera', icon: 'schedule' },
        buy: { label: 'Por comprar', icon: 'shopping_bag' }
    };

    readonly currentBook = {
        title: 'Siega', author: 'Neal Shusterman', saga: 'El arco de la guadaña · Libro 1',
        chapter: 'Capítulo 13 · El cónclave vernal', page: 183, pages: 435, cover: ['#b3261e', '#f2e6d8'] as [string, string]
    };

    readonly groups: PreviewGroup[] = [
        {
            name: 'Sin universo', author: 'Varios', count: 60, progress: 38, open: true,
            sagas: [
                { name: 'Crónica del asesino de reyes', author: 'Patrick Rothfuss', books: [] },
                { name: 'Daevabad', author: 'Shannon Chakraborty', books: [] },
                {
                    name: 'El arco de la guadaña', author: 'Neal Shusterman', open: true, books: [
                        { title: 'Siega', author: 'Neal Shusterman', status: 'reading', progress: 42, cover: ['#b3261e', '#f2e6d8'] },
                        { title: 'Nimbo', author: 'Neal Shusterman', status: 'buy', progress: 0, cover: ['#1f7a74', '#dff1ee'] },
                        { title: 'Peaje', author: 'Neal Shusterman', status: 'buy', progress: 0, cover: ['#26314f', '#e9e2cf'] }
                    ]
                },
                { name: 'Empíreo', author: 'Rebecca Yarros', books: [] },
                { name: 'Escolomancia', author: 'Naomi Novik', books: [] }
            ]
        },
        { name: 'El cosmere', author: 'Brandon Sanderson', count: 21, progress: 61, sagas: [] },
        { name: 'La corte de tronos', author: 'Sarah J. Maas', count: 10, progress: 80, sagas: [] },
        { name: 'El reino de los ancianos', author: 'Robin Hobb', count: 1, progress: 100, sagas: [] }
    ];

    readonly chapters = [
        { part: 'Túnica y anillo', items: ['Y el sol no se oscureció', '0,303 %', 'La fuerza del destino', 'Asesino en prácticas', 'Pero si solo tengo 96 años…'] },
        { part: 'No acatarás más leyes que estas', items: ['Una elegía de segadores', 'El arte de matar', 'Cuestión de gustos', 'Esme', 'Respuestas prohibidas', 'Indiscreciones', 'No hay margen para la mediocridad', 'El cónclave vernal'] }
    ];

    readonly characters = {
        principal: ['Citra', 'Rowan'],
        recurrent: ['Faraday', 'Curie'],
        secondary: ['Ben', 'Esme', 'Tyger', 'Goddard', 'Rand', 'Xenócrates']
    };

    readonly libraryLinks = [
        { icon: 'history_edu', label: 'Autores', value: 61 },
        { icon: 'public', label: 'Universos', value: 12 },
        { icon: 'bookmarks', label: 'Sagas', value: 45 },
        { icon: 'menu_book', label: 'Libros', value: 122 },
        { icon: 'collections_bookmark', label: 'Antologías', value: 4 }
    ];

    constructor(route: ActivatedRoute) {
        route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
            const candidate = params.get('screen') as WebPreviewScreen | null;
            this.screen.set(candidate && SCREENS.has(candidate) ? candidate : 'library');
            this.drawerOpen.set(false);
        });
        route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
            if (params.get('theme') === 'dark') this.theme.set('dark');
        });
    }

    toggleTheme(): void {
        this.theme.update(theme => theme === 'light' ? 'dark' : 'light');
    }

    coverStyle(cover: [string, string]): string {
        return `--cover-ink: ${cover[0]}; --cover-paper: ${cover[1]}`;
    }
}
