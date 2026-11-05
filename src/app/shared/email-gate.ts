import { HttpErrorResponse } from '@angular/common/http';
import { Observable, from, switchMap, throwError } from 'rxjs';
import { PlatformSessionService } from '../services/auth/platform-session.service';

/** El `code` de lo social con el correo sin confirmar (kit 1.80), el mismo que usa la plataforma. */
export const EMAIL_NOT_CONFIRMED = 'correo_sin_confirmar';
const EMAIL_NOT_CONFIRMED_TEXT = 'Confirma tu correo para publicar reseñas o denunciarlas.';

/**
 * Lo social propio de Libros (publicar una reseña, denunciar una) solo sale con el correo confirmado: si no lo está,
 * el SDK pide el código y, si la persona no lo confirma, falla con `correo_sin_confirmar` sin llamar a la API.
 */
export function afterEmailConfirmed<T>(session: PlatformSessionService, request: () => Observable<T>): Observable<T> {
    if (!session.needsEmailConfirmation()) return request();
    return from(session.confirmEmail()).pipe(
        switchMap(confirmed => confirmed
            ? request()
            : throwError(() => new HttpErrorResponse({ status: 403, error: { error: EMAIL_NOT_CONFIRMED_TEXT, code: EMAIL_NOT_CONFIRMED } })))
    );
}
