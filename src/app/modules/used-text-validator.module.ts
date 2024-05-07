import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ValidatorFn } from '@angular/forms';

@NgModule({
    declarations: [],
    imports: [
        CommonModule
    ]
})
export class customValidatorsModule {

    usedTextValidator(valoresProhibidos: string[]): ValidatorFn {
        return (control: AbstractControl): { [key: string]: any } | null => {
            const valorIngresado = control.value?.toLowerCase();
            if (valoresProhibidos.length != 0 && valoresProhibidos.includes(valorIngresado))
                return { forbiddenValue: true };
            return null;
        };
    }
}
