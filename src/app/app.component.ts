import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavbarComponent } from './components/shared/common/navbar/navbar.component';
import { RouterComponent } from './components/shared/common/main-router/router.component';
import { FooterComponent } from './components/shared/common/footer/footer.component';
import { LoaderEmmitterService } from './services/emmitters/loader.service';
import { SessionService } from './services/auth/session.service';
import { AuthorStoreService } from './services/stores/author-store.service';
import { UniverseStoreService } from './services/stores/universe-store.service';
import { forkJoin } from 'rxjs';
import { AppToastHostComponent } from './shared/toast/app-toast-host.component';
import { CatalogService } from './services/entities/catalog.service';
import { CollectionService } from './services/entities/collection.service';
import { getProductStateMessage } from './shared/api-error-message';
import { AppToastService } from './shared/toast/app-toast.service';

@Component({
    standalone: true,
    selector:  'app-root',
    imports: [
        NavbarComponent,
        RouterComponent,
        FooterComponent,
        AppToastHostComponent
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
    title = 'Memoria bibliográfica';
    building: boolean = true;
    dragonLoader = 'assets/media/img/dragon1-unscreen.gif';
    loaderMessage = 'Cargando...';
    private dragonLoaders = [
        'assets/media/img/dragon1-unscreen.gif',
        'assets/media/img/dragon2-unscreen.gif',
        'assets/media/img/dragon3-unscreen.gif'
    ];
    private loginLoaderMessages = [
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

    constructor(
        private loader: LoaderEmmitterService,
        private sessionSrv: SessionService,
        private collectionSrv: CollectionService,
        private universeStore: UniverseStoreService,
        private catalogSrv: CatalogService,
        private authorStore: AuthorStoreService,
        private cdRef: ChangeDetectorRef,
        private toasts: AppToastService
    ) { }


    ngOnInit(): void {
        this.loader.loaderStatus$.subscribe(value => {
            if (value.active) {
                this.dragonLoader = this.getRandomDragonLoader();
                this.loaderMessage = this.getRandomLoaderMessage(value.context);
            }
            this.building = value.active;
            this.cdRef.detectChanges();
        });

        if (this.sessionSrv.canAccessLibrary) {
            this.loader.activateLoader();

            forkJoin({
                universes: this.collectionSrv.getUniverses(),
                authors: this.catalogSrv.getAuthors()
            }).subscribe({
                next: ({ universes, authors }) => {
                    this.universeStore.setUniverses(universes);
                    this.authorStore.setAuthors(authors);
                },
                error: (error) => {
                    console.error("Error cargando datos iniciales.");
                    if (this.sessionSrv.userIsLogged)
                        this.sessionSrv.logout();
                    this.loader.deactivateLoader();
                    const cause = getProductStateMessage(error, 'La API no ha permitido cargar tu biblioteca.');
                    this.toasts.showError(`No se pudo restaurar la sesión. ${cause} Se ha cerrado la sesión.`, { durationMs: 6000 });
                },
                complete: () => {
                    this.loader.deactivateLoader();
                }
            });
        }
    }

    private getRandomDragonLoader(): string {
        const randomIndex = Math.floor(Math.random() * this.dragonLoaders.length);
        return this.dragonLoaders[randomIndex];
    }

    private getRandomLoaderMessage(context: 'default' | 'login' | 'book'): string {
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
