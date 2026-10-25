import { ChangeDetectorRef, Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { NavbarComponent } from './components/shared/common/navbar/navbar.component';
import { RouterComponent } from './components/shared/common/main-router/router.component';
import { FooterComponent } from './components/shared/common/footer/footer.component';
import { LoaderEmmitterService } from './services/emmitters/loader.service';
import { PlatformSessionService } from './services/auth/platform-session.service';
import { AuthorStoreService } from './services/stores/author-store.service';
import { UniverseStoreService } from './services/stores/universe-store.service';
import { combineLatest, finalize, Subscription, timeout } from 'rxjs';
import { AppToastHostComponent } from './shared/toast/app-toast-host.component';
import { CatalogService } from './services/entities/catalog.service';
import { CollectionService } from './services/entities/collection.service';
import { getProductStateMessage } from './shared/api-error-message';
import { AppToastService } from './shared/toast/app-toast.service';
import { DecisionNoticeHostComponent } from './shared/notifications/decision-notice-host.component';
import { AdaptiveLayoutService } from './services/ui/adaptive-layout.service';
import { ConnectivityService } from './services/ui/connectivity.service';
import { PwaLifecycleService } from './services/ui/pwa-lifecycle.service';
import { MatIconModule } from '@angular/material/icon';
import { PresentationModeService } from './services/ui/presentation-mode.service';
import { CommandPaletteService } from './services/ui/command-palette.service';
import { WebCommandPaletteComponent } from './components/web/ui/web-command-palette/web-command-palette.component';

/** Los tres dragones del cargador. */
const DRAGON_LOADERS = [
    'assets/media/img/dragon1-unscreen.gif',
    'assets/media/img/dragon2-unscreen.gif',
    'assets/media/img/dragon3-unscreen.gif'
];

@Component({
    standalone: true,
    selector:  'app-root',
    imports: [
        NavbarComponent,
        RouterComponent,
        FooterComponent,
        AppToastHostComponent,
        DecisionNoticeHostComponent,
        MatIconModule,
        WebCommandPaletteComponent
    ],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
    readonly commandPalette = inject(CommandPaletteService);
    title = 'Memoria bibliográfica';
    building: boolean = true;
    /**
     * Uno de los tres dragones, al azar en cada carga de la página y el mismo en todas sus cargas: así no cambia al pasar
     * de la sesión a la biblioteca (por eso se dejó uno fijo en septiembre de 2026, y se perdieron los otros dos).
     */
    dragonLoader = DRAGON_LOADERS[Math.floor(Math.random() * DRAGON_LOADERS.length)];
    loaderMessage = 'Cargando...';
    /** La frase mientras se restaura la sesión: una divertida al azar, no un «Recuperando tu biblioteca…» soso. */
    sessionLoaderMessage = '';
    sessionReady = false;
    private loginLoaderMessages = [
        'El dragón quiere recomendarte un libro...',
        'El dragón está comprobando tus credenciales...',
        'Abriendo el portal de la biblioteca...',
        'Desempolvando tu grimorio personal...',
        'Invocando tu estantería secreta...',
        'El guardián de la biblioteca revisa tu pase...',
        'Consultando los archivos del reino...',
        'Afiliando tu alma lectora al gremio...',
        'Encendiendo las velas de lectura...',
        'El dragón está oliendo si eres tú...',
        'Buscando tu marca entre los pergaminos...',
        'Desbloqueando la puerta de la torre...',
        'El bibliotecario arcano está verificando tu identidad...',
        'Preparando tu rincón junto al fuego...',
        'Quitando telarañas digitales de tu cuenta...',
        'Abriendo la cubierta de tu aventura...',
        'El dragón está buscando tus gafas de leer...',
        'Comprobando que no seas un mimético disfrazado...',
        'Cargando tu santuario de historias...',
        'El sello mágico está casi listo...',
        'Despertando a los personajes que dejaste dormidos...',
        'Revisando si tienes permiso para entrar al archivo prohibido...',
        'El dragón está firmando tu entrada con tinta encantada...',
        'Afinando las runas de acceso...',
        'La biblioteca te reconoce... más o menos.',
        'Casi dentro. El dragón escribe lento, pero con buena letra.'
    ];
    private bookLoaderMessages = [
        'Abriendo el libro por la página correcta...',
        'El dragón está pasando las páginas con cuidado...',
        'Despertando a los personajes...',
        'Sacudiendo el polvo de la portada...',
        'Preparando tinta, papel y un poco de magia...',
        'Buscando el punto exacto donde te quedaste...',
        'La historia está afilando sus giros de guion...',
        'Cargando capítulos, secretos y alguna que otra desgracia...',
        'El narrador está tomando aire...',
        'Los personajes se están colocando en escena...',
        'Abriendo una puerta a otro mundo...',
        'El dragón está calentando el atril...',
        'Ordenando capítulos en la estantería astral...',
        'Reuniendo héroes, villanos y secundarios sospechosos...',
        'El libro está recordando cómo empezaba...',
        'Cuidado: aventura en proceso de invocación.',
        'Preparando la lámpara, la manta y el caos narrativo...',
        'La portada se está abriendo sola...',
        'Cargando mundos, mapas y decisiones cuestionables...',
        'El dragón está marcando tu última página...',
        'Los pergaminos se están desenrollando...',
        'Silencio, la historia está despertando...',
        'Invocando escenas pendientes...',
        'Los márgenes están susurrando spoilers. Ignóralos.',
        'El capítulo está entrando en escena con dramatismo.',
        'Ajustando el marcapáginas dimensional...',
        'Reanudando la expedición literaria...',
        'Poniendo a los protagonistas en posición de sufrir...',
        'El libro está abriendo sus fauces...',
        'Cargando una dosis aceptable de fantasía y café imaginario...'
    ];
    private extraLoaderMessages = [
        'El dragón olvidó la contraseña. Otra vez.',
        'Los personajes no quieren salir todavía.',
        'Buscando al protagonista. Se había ido a por pan.',
        'El villano está maquillándose. Un momento.',
        'El libro está cargando... y juzgando tus hábitos de sueño.',
        'El dragón insiste en releer el prólogo.',
        'Hay un mago bloqueando la página. Estamos negociando.',
        'Los capítulos se han desordenado. Culpa del duende.',
        'El narrador está improvisando con dignidad.',
        'El marcapáginas cayó en otra dimensión.',
        'Los secundarios piden más protagonismo. Ignóralos.',
        'El dragón está escribiendo "cargando" con caligrafía gótica.',
        'Preparando tragedias menores y aventuras mayores.',
        'La biblioteca está abierta, pero el dragón busca las llaves.',
        'Cargando... porque incluso la magia necesita un segundo.'
    ];
    private libraryRestored = false;
    private libraryRestorationInFlight = false;
    /** La cuenta (su generación) para la que se está recuperando la biblioteca, y esa recuperación. */
    private libraryRestorationGeneration: number | null = null;
    private libraryRestoration: Subscription | null = null;

    constructor(
        private loader: LoaderEmmitterService,
        private sessionSrv: PlatformSessionService,
        private collectionSrv: CollectionService,
        private universeStore: UniverseStoreService,
        private catalogSrv: CatalogService,
        private authorStore: AuthorStoreService,
        private cdRef: ChangeDetectorRef,
        private toasts: AppToastService,
        private adaptiveLayout: AdaptiveLayoutService,
        private presentationMode: PresentationModeService,
        readonly connectivity: ConnectivityService,
        readonly pwa: PwaLifecycleService
    ) { }

    ngOnInit(): void {
        this.sessionLoaderMessage = this.getRandomLoaderMessage('library');
        void this.adaptiveLayout.snapshot;
        void this.presentationMode.snapshot;
        this.loader.loaderStatus$.subscribe(value => {
            // Un mismo proceso puede emitir varias veces mientras sigue activo (por
            // ejemplo, el guard del libro confirma la carga iniciada desde la
            // tarjeta). La variante visual pertenece a la apertura del loader,
            // no a cada una de esas emisiones.
            if (value.active && !this.building) {
                this.loaderMessage = this.getRandomLoaderMessage(value.context);
            }
            this.building = value.active;
            this.cdRef.detectChanges();
        });

        this.sessionSrv.sessionInitializedSubject.subscribe(ready => {
            this.sessionReady = ready;
            this.cdRef.detectChanges();
        });

        combineLatest([this.connectivity.online$, this.sessionSrv.userIsLogged$]).subscribe(([online, logged]) => {
            if (!logged) {
                this.libraryRestored = false;
                return;
            }
            if (online)
                this.restoreLibrary();
        });
    }

    installApp(): void {
        void this.pwa.install();
    }

    retryConnection(): void {
        this.connectivity.retry();
    }

    private restoreLibrary(): void {
        const generation = this.sessionSrv.generation;
        if (!this.sessionSrv.canAccessLibrary || this.libraryRestored)
            return;
        // Una recuperación de la cuenta anterior que aún no ha respondido no frena la de la cuenta nueva
        // (CAMBIO_DE_CUENTA.md): se abandona y se pide la biblioteca de quien está ahora.
        if (this.libraryRestorationInFlight && this.libraryRestorationGeneration === generation)
            return;
        this.libraryRestoration?.unsubscribe();

        this.libraryRestorationInFlight = true;
        this.libraryRestorationGeneration = generation;
        this.loader.activateLoader('library');
        // Lo que llegue de otra cuenta (CAMBIO_DE_CUENTA.md) no se guarda: el interceptor ya lo descarta, y aquí
        // tampoco se aplica el catálogo de autores que se pide después.

        // La biblioteca es la superficie necesaria para entrar. El catálogo de
        // autores es auxiliar y no debe mantener toda la app bloqueada.
        this.libraryRestoration = this.collectionSrv.getUniverses().pipe(
            timeout({ first: 16_000 }),
            finalize(() => {
                if (this.libraryRestorationGeneration !== generation) return;
                this.libraryRestorationInFlight = false;
                this.loader.deactivateLoader();
            })
        ).subscribe({
            next: universes => {
                if (!this.sessionSrv.isCurrentGeneration(generation)) return;
                this.universeStore.setUniverses(universes);
                this.libraryRestored = true;
                this.catalogSrv.getAuthors().pipe(timeout({ first: 30000 })).subscribe({
                    next: authors => { if (this.sessionSrv.isCurrentGeneration(generation)) this.authorStore.setAuthors(authors); },
                    error: () => this.toasts.showSystem('El catálogo de autores tardó demasiado. Se volverá a cargar cuando lo necesites.', {
                        title: 'Catálogo pendiente', dedupeKey: 'library:authors:timeout', durationMs: 6000
                    })
                });
            },
            error: (error) => {
                console.error('Error cargando datos iniciales.');
                // La autenticación ya terminó correctamente. Un fallo de datos
                // no invalida la sesión; los errores terminales de auth los
                // procesa ErrorInterceptorService antes de llegar aquí.
                if (!this.sessionSrv.userIsLogged || !this.sessionSrv.isCurrentGeneration(generation))
                    return;
                const cause = getProductStateMessage(error, 'La API no ha permitido cargar tu biblioteca.');
                this.toasts.showSystem(`${cause} Tu sesión se conserva.`, {
                    title: 'No se pudo cargar la biblioteca',
                    dedupeKey: 'library:restore:error',
                    durationMs: 10000,
                    action: { label: 'Reintentar', execute: () => this.restoreLibrary() }
                });
            }
        });
    }

    private getRandomLoaderMessage(context: 'default' | 'login' | 'book' | 'library'): string {
        if (context === 'library')
            return this.getRandomFrom([...this.loginLoaderMessages, ...this.extraLoaderMessages]);
        if (context === 'login')
            return this.getRandomFrom(this.loginLoaderMessages);
        if (context === 'book')
            return this.getRandomFrom([...this.bookLoaderMessages, ...this.extraLoaderMessages]);
        return this.getRandomFrom(this.extraLoaderMessages);
    }

    private getRandomFrom(messages: string[]): string {
        const randomIndex = Math.floor(Math.random() * messages.length);
        return messages[randomIndex];
    }
}
