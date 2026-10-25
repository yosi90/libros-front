import { Injectable } from '@angular/core';
import { filter } from 'rxjs';
import { CatalogViewStateService } from '../../shared/catalog-view-state.service';
import { LibrarySearchStateService } from '../../shared/library-search-state.service';
import { ManagerViewStateService } from '../../shared/manager-view-state.service';
import { LoaderEmmitterService } from '../emmitters/loader.service';
import { DecisionNoticeService } from '../navigation/decision-notice.service';
import { MobileFullscreenReturnService } from '../navigation/mobile-fullscreen-return.service';
import { ReadingReturnService } from '../navigation/reading-return.service';
import { ClubAccessService } from '../platform/club-access.service';
import { PlatformRealtimeService } from '../platform/platform-realtime.service';
import { PlatformSpacesService } from '../platform/platform-spaces.service';
import { AuthorStoreService } from '../stores/author-store.service';
import { BookStoreService } from '../stores/book-store.service';
import { ChatFloatingCoordinatorService } from '../stores/chat-floating-coordinator.service';
import { ChatStoreService } from '../stores/chat-store.service';
import { CommunityCapabilitiesService } from '../stores/community-capabilities.service';
import { FloatingWindowManagerService } from '../stores/floating-window-manager.service';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { UniverseStoreService } from '../stores/universe-store.service';
import { PendingWorkService } from './pending-work.service';
import { PlatformSessionService } from './platform-session.service';

/**
 * Lo que Libros guarda en memoria de la persona, en un solo sitio (CAMBIO_DE_CUENTA.md, obligaciones 2 y 3):
 * con cada cambio de identidad se vacían la biblioteca, el libro abierto, el catálogo, los estados de las vistas, los
 * avisos, el chat (bandeja, ventanas flotantes y escucha del tiempo real de la plataforma), los canales de los espacios
 * de los clubes y sus invitaciones y solicitudes, antes de presentar la cuenta nueva. Los editores con cambios sin
 * enviar los apartan para su cuenta (`PendingWorkService`) en lugar de enviarlos con la nueva. Y cuando Libros ya sabe
 * quién es la cuenta nueva, se arrancan sus servicios con su generación.
 */
@Injectable({ providedIn: 'root' })
export class AccountScopeService {
    private started = false;

    constructor(
        private session: PlatformSessionService,
        private universes: UniverseStoreService,
        private authors: AuthorStoreService,
        private books: BookStoreService,
        private librarySearch: LibrarySearchStateService,
        private catalogView: CatalogViewStateService,
        private managerView: ManagerViewStateService,
        private readingReturn: ReadingReturnService,
        private decisions: DecisionNoticeService,
        private moderationAccess: ModerationAccessService,
        private capabilities: CommunityCapabilitiesService,
        private realtime: PlatformRealtimeService,
        private chatStore: ChatStoreService,
        private chatFloating: ChatFloatingCoordinatorService,
        private floatingWindows: FloatingWindowManagerService,
        private mobileFullscreenReturn: MobileFullscreenReturnService,
        private loader: LoaderEmmitterService,
        private spaces: PlatformSpacesService,
        private clubAccess: ClubAccessService,
        private pendingWork: PendingWorkService
    ) { }

    start(): void {
        if (this.started) return;
        this.started = true;
        this.session.identityChange$.subscribe(() => this.clearAccountData());
        this.session.userIsLogged$.pipe(filter(logged => logged)).subscribe(() => {
            // El trabajo sin enviar se aparta y se recupera por entorno y cuenta (CAMBIO_DE_CUENTA.md, obligación 4).
            this.pendingWork.setScope(this.session.storageScope);
            this.startAccountServices(this.session.generation, this.session.userId);
        });
    }

    clearAccountData(): void {
        // Primero, los editores abiertos: dejan de enviar (el token ya es de otra cuenta) y apartan lo que no habían
        // guardado para la cuenta que lo escribió.
        this.pendingWork.abandonAll();
        this.loader.deactivateLoader();
        // El chat de la plataforma: la escucha del tiempo real (el SDK cierra el socket cuando nadie escucha), la bandeja
        // y las ventanas flotantes. La campana `<yosi-notificaciones>` se vacía sola con el cambio de sesión del SDK.
        this.realtime.stop();
        // Los clubes: se cierran los canales de sus espacios y se olvidan las invitaciones, las solicitudes enviadas y
        // las entradas recientes de la cuenta anterior.
        this.spaces.clear();
        this.clubAccess.clear();
        this.chatFloating.clear();
        this.chatStore.clear();
        this.floatingWindows.clear();
        this.decisions.reset();
        this.moderationAccess.clear();
        this.capabilities.clear();
        this.universes.clear();
        this.authors.clear();
        this.books.clear();
        this.librarySearch.clear();
        this.catalogView.reset();
        this.managerView.reset();
        this.readingReturn.dismiss();
        this.mobileFullscreenReturn.clear();
    }

    private startAccountServices(generation: number, userId: number): void {
        if (!this.session.isCurrentGeneration(generation) || userId < 1) return;
        this.moderationAccess.refresh().subscribe();
        this.capabilities.initialize(userId).subscribe();
    }
}
