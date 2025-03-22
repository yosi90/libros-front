import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export abstract class ErrorHandlerService {

    public errorHandle(errorCode: HttpErrorResponse, titulo: string): Observable<never> {
        let errorMessage: string;
        switch (errorCode.status) {
            case 401:
                errorMessage = `No tienes permiso`;
                break;
            case 403:
                errorMessage = `Acceso prohibido`;
                break;
            case 404:
                errorMessage = `${titulo} no válido`;
                break;
            case 500:
                errorMessage = `El servidor no logró dar respuesta`;
                break;
            default:
                errorMessage = errorCode?.error?.message || errorCode.message || 'Error desconocido';

        }

        // Retornar un observable de error con el mensaje apropiado
        return throwError(() => {
            const custom = new Error(errorMessage);
            (custom as any).status = errorCode.status;
            (custom as any).raw = errorCode;
            return custom;
        });

    }
}
