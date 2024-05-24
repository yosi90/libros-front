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

    usedTextValidator(valoresProhibidos: string[], valorPrevio: string = ''): ValidatorFn {
        return (control: AbstractControl): { [key: string]: any } | null => {
            const valorIngresado = control.value?.toLowerCase();
            if (valoresProhibidos.length != 0 && valoresProhibidos.includes(valorIngresado) && valorIngresado !== valorPrevio.toLocaleLowerCase())
                return { forbiddenValue: true };
            return null;
        };
    }
}
