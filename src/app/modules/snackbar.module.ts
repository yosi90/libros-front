import { NgModule } from "@angular/core";
import { AppToastService } from "../shared/toast/app-toast.service";
import { AppToastOptions, AppToastType } from "../shared/toast/app-toast";
import { resolveNotificationTitle } from '../shared/toast/notification-title';
import { getApiErrorMessage, isPolicyAcceptanceBlock } from '../shared/api-error-message';

@NgModule({
    declarations: [],
    imports: [],
    exports: []
})
export class SnackbarModule {

    constructor(private appToastSrv: AppToastService) {}

    openSnackBar(errorString: string, cssClass: string, duration: number = 3000, options?: Omit<AppToastOptions, 'durationMs'>) {
        const type = this.resolveToastType(cssClass);
        const title = resolveNotificationTitle(type, errorString, options?.title);
        const dedupeKey = options?.dedupeKey ?? `legacy-snackbar:${type}:${title}:${errorString}`.toLowerCase();
        const toastOptions: AppToastOptions = { ...options, durationMs: duration, dedupeKey, title };

        if (type === 'success')
            this.appToastSrv.showSuccess(errorString, toastOptions);
        else if (type === 'error')
            this.appToastSrv.showError(errorString, toastOptions);
        else if (type === 'system')
            this.appToastSrv.showSystem(errorString, toastOptions);
        else
            this.appToastSrv.showInfo(errorString, toastOptions);
    }

    /**
     * Error de la API: el título es el texto genérico de la pantalla («Error al
     * actualizar el libro») y el mensaje, el concreto del backend («Revisa el
     * título.»). Sin texto del backend, el aviso muestra solo el genérico.
     */
    openApiError(error: unknown, fallback = 'No se pudo completar la acción', duration: number = 3000, options?: Omit<AppToastOptions, 'durationMs'>) {
        // Normas pendientes: no es un fallo; el interceptor ya abrió el aviso que explica qué aceptar.
        if (isPolicyAcceptanceBlock(error)) return;
        this.openSnackBar(getApiErrorMessage(error, fallback), 'errorBar', duration, { ...options, title: options?.title ?? fallback });
    }

    private resolveToastType(cssClass: string): AppToastType {
        if (cssClass.startsWith('errorBar'))
            return 'error';
        if (cssClass.startsWith('successBar'))
            return 'success';
        if (cssClass.startsWith('systemBar'))
            return 'system';
        return 'info';
    }
}
