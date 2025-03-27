import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavbarComponent } from './components/shared/common/navbar/navbar.component';
import { RouterComponent } from './components/shared/common/main-router/router.component';
import { FooterComponent } from './components/shared/common/footer/footer.component';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from '@dchtools/ngx-loading-v18';
import { LoaderEmmitterService } from './services/emmitters/loader.service';
import { SessionService } from './services/auth/session.service';
import { AuthorService } from './services/entities/author.service';
import { UniverseService } from './services/entities/universe.service';
import { AuthorStoreService } from './services/stores/author-store.service';
import { UniverseStoreService } from './services/stores/universe-store.service';
import { forkJoin } from 'rxjs';

@Component({
    standalone: true,
    selector:  'app-root',
    imports: [
        NavbarComponent,
        RouterComponent,
        FooterComponent,
        NgxLoadingModule
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass'
})
export class AppComponent implements OnInit {
    title = 'Memoria bibliográfica';
    building: boolean = true;

    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000'
    };

    constructor(
        private loader: LoaderEmmitterService,
        private sessionSrv: SessionService,
        private universeSrv: UniverseService,
        private universeStore: UniverseStoreService,
        private authorSrv: AuthorService,
        private authorStore: AuthorStoreService,
        private cdRef: ChangeDetectorRef
    ) { }


    ngOnInit(): void {
        this.loader.loaderStatus$.subscribe(value => {
            this.building = value;
            this.cdRef.detectChanges();
        });

        if (this.sessionSrv.userIsLogged) {
            this.loader.activateLoader();

            forkJoin({
                universes: this.universeSrv.getUniverses(),
                authors: this.authorSrv.getAllAuthors()
            }).subscribe({
                next: ({ universes, authors }) => {
                    this.universeStore.setUniverses(universes);
                    this.authorStore.setAuthors(authors);
                },
                error: () => {
                    console.error("Error cargando datos iniciales.");
                    this.sessionSrv.logout();
                },
                complete: () => {
                    this.loader.deactivateLoader();
                }
            });
        }
    }
}
