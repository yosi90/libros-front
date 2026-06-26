import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface PendingChangesComponent {
    canDeactivate: () => boolean | Observable<boolean>;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesComponent> = (component) => {
    return component.canDeactivate ? component.canDeactivate() : true;
};
