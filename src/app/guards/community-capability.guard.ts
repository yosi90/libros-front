import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { CommunityCapabilityId } from '../interfaces/community-capabilities';
import { SessionService } from '../services/auth/session.service';
import { CommunityCapabilitiesService } from '../services/stores/community-capabilities.service';

export const communityCapabilityGuard: CanActivateFn = route => {
    const capability = route.data?.['communityCapability'] as CommunityCapabilityId | undefined;
    const session = inject(SessionService);
    const capabilities = inject(CommunityCapabilitiesService);
    const router = inject(Router);
    if (!capability) return true;
    return capabilities.ensure(session.userId).pipe(map(() => capabilities.isActive(capability) || router.parseUrl('/dashboard/books')));
};
