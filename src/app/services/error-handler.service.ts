import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { getApiErrorMessage } from '../shared/api-error-message';

export abstract class ErrorHandlerService {

    public errorHandle(errorCode: HttpErrorResponse, titulo: string): Observable<never> {
        const backendMessage = getApiErrorMessage(errorCode, '');
        let errorMessage: string;
        switch (errorCode.status) {
            case 0:
                errorMessage = backendMessage || `No se pudo conectar con el servidor`;
                break;
            case 401:
                errorMessage = backendMessage || `No tienes permiso`;
                break;
            case 403:
                errorMessage = backendMessage || `Acceso prohibido`;
                break;
            case 404:
                errorMessage = backendMessage || `${titulo} no válido`;
                break;
            case 500:
                errorMessage = backendMessage || `El servidor no logró dar respuesta`;
                break;
            default:
                errorMessage = backendMessage || 'Error desconocido';

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
