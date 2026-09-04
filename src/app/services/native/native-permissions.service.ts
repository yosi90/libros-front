import { Inject, Injectable, InjectionToken } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

export type AppPermissionId = 'notifications' | 'camera' | 'photos' | 'microphone';
export type AppPermissionState = 'granted' | 'limited' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unsupported';

export type AppPermissionStates = Record<AppPermissionId, AppPermissionState>;

interface AppPermissionsPlugin {
    status(): Promise<Record<AppPermissionId, string>>;
    request(options: { permission: AppPermissionId }): Promise<Record<AppPermissionId, string>>;
    openSettings(): Promise<void>;
}

export const APP_PERMISSIONS_PLUGIN = new InjectionToken<AppPermissionsPlugin>('APP_PERMISSIONS_PLUGIN', {
    providedIn: 'root',
    factory: () => registerPlugin<AppPermissionsPlugin>('AppPermissions')
});

const unsupportedStates = (): AppPermissionStates => ({
    notifications: 'unsupported',
    camera: 'unsupported',
    photos: 'unsupported',
    microphone: 'unsupported'
});

@Injectable({ providedIn: 'root' })
export class NativePermissionsService {
    constructor(
        @Inject(APP_PERMISSIONS_PLUGIN) private plugin: AppPermissionsPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) readonly supported: boolean
    ) { }

    async status(): Promise<AppPermissionStates> {
        if (!this.supported) return unsupportedStates();
        return this.normalize(await this.plugin.status());
    }

    async request(permission: AppPermissionId): Promise<AppPermissionStates> {
        if (!this.supported) return unsupportedStates();
        return this.normalize(await this.plugin.request({ permission }));
    }

    async openSettings(): Promise<void> {
        if (this.supported) await this.plugin.openSettings();
    }

    private normalize(states: Partial<Record<AppPermissionId, string>>): AppPermissionStates {
        const normalized = unsupportedStates();
        (Object.keys(normalized) as AppPermissionId[]).forEach(permission => {
            const state = states[permission]?.toLowerCase();
            normalized[permission] = state === 'granted' || state === 'limited' || state === 'denied' || state === 'prompt' || state === 'prompt-with-rationale'
                ? state
                : 'denied';
        });
        return normalized;
    }
}
