import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/shared/common/navbar/navbar.component';
import { RouterComponent } from './components/shared/common/main-router/router.component';
import { FooterComponent } from './components/shared/common/footer/footer.component';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { LoaderEmmitterService } from './services/emmitters/loader.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterOutlet,
        NavbarComponent,
        RouterComponent,
        FooterComponent,
        NgxLoadingModule
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.sass',
})
export class AppComponent implements OnInit {
    title = 'Memoria bibliográfica';
    building: boolean = true;

    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000'
    };

    constructor(private loader: LoaderEmmitterService) { }

    ngOnInit(): void {
        this.loader.loaderStatus$.subscribe(value => this.building = value);
    }
}
