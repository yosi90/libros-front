import { NgModule } from "@angular/core";
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';

@NgModule({
    declarations: [],
    imports: [],
    exports: []
})
export class SnackbarModule {

    horizontalPosition: MatSnackBarHorizontalPosition = 'center';
    verticalPosition: MatSnackBarVerticalPosition = 'top';

    constructor(private _snackBar: MatSnackBar) {}

    openSnackBar(errorString: string, cssClass: string, duration: number = 3000) {
        this._snackBar.open(errorString, 'Ok', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
            duration: duration,
            panelClass: [cssClass],
        });
    }
}