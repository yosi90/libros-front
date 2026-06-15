import { NgModule } from "@angular/core";
import { AppToastService } from "../shared/toast/app-toast.service";
import { AppToastType } from "../shared/toast/app-toast";

@NgModule({
    declarations: [],
    imports: [],
    exports: []
})
export class SnackbarModule {

    constructor(private appToastSrv: AppToastService) {}

    openSnackBar(errorString: string, cssClass: string, duration: number = 3000) {
        const type = this.resolveToastType(cssClass);
        const dedupeKey = `legacy-snackbar:${cssClass}:${errorString}`.toLowerCase();

        if (type === 'success')
            this.appToastSrv.showSuccess(errorString, { durationMs: duration, dedupeKey });
        else if (type === 'error')
            this.appToastSrv.showError(errorString, { durationMs: duration, dedupeKey });
        else if (type === 'system')
            this.appToastSrv.showSystem(errorString, { durationMs: duration, dedupeKey });
        else
            this.appToastSrv.showInfo(errorString, { durationMs: duration, dedupeKey });
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
