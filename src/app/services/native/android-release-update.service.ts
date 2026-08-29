import { Inject, Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { App } from '@capacitor/app';
import type { AppInfo, AppPlugin } from '@capacitor/app';
import { firstValueFrom } from 'rxjs';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { ExternalNavigationService } from './external-navigation.service';

interface GitHubReleaseAsset {
    name: string;
    browser_download_url: string;
}

interface GitHubRelease {
    tag_name: string;
    html_url: string;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    assets: GitHubReleaseAsset[];
}

export interface AndroidReleaseMetadata {
    version: string;
    versionCode: number | null;
    url: string;
    checksumUrl: string;
    notes: string;
}

export const ANDROID_RELEASE_APP_PLUGIN = new InjectionToken<Pick<AppPlugin, 'getInfo'>>('ANDROID_RELEASE_APP_PLUGIN', {
    providedIn: 'root',
    factory: () => inject(NATIVE_MOBILE_PLATFORM) ? App : {} as Pick<AppPlugin, 'getInfo'>
});

@Injectable({ providedIn: 'root' })
export class AndroidReleaseUpdateService {
    private readonly latestReleaseUrl = 'https://api.github.com/repos/yosi90/libros-front/releases/latest';
    private checked = false;

    constructor(
        private http: HttpClient,
        private toasts: AppToastService,
        private externalNavigation: ExternalNavigationService,
        @Inject(ANDROID_RELEASE_APP_PLUGIN) private app: Pick<AppPlugin, 'getInfo'>,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    async check(): Promise<void> {
        if (!this.nativeMobile || this.checked)
            return;
        this.checked = true;

        try {
            const appInfo = await this.app.getInfo();
            if (appInfo.id !== 'es.yosiftware.libros')
                return;

            const release = await firstValueFrom(this.http.get<GitHubRelease>(this.latestReleaseUrl));
            const metadata = this.toMetadata(release);
            if (!metadata || this.compareVersions(metadata.version, appInfo.version) <= 0)
                return;

            this.toasts.showSystem(`La versión ${metadata.version} está disponible para Android. La descarga se abrirá en GitHub.`, {
                title: 'Actualización disponible',
                dedupeKey: `android:update:${metadata.version}`,
                durationMs: 30000,
                action: {
                    label: 'Descargar',
                    execute: () => this.externalNavigation.open(metadata.url)
                }
            });
        } catch {
            // La comprobación es informativa: no bloquea el arranque ni reintenta a ciegas.
        }
    }

    private toMetadata(release: GitHubRelease): AndroidReleaseMetadata | null {
        if (release.draft || release.prerelease)
            return null;
        const versionMatch = /^android-v(\d+\.\d+\.\d+)$/.exec(release.tag_name);
        if (!versionMatch)
            return null;

        const apk = release.assets.find(asset => /^memoria-bibliografica-\d+\.\d+\.\d+\.apk$/.test(asset.name));
        const checksum = apk
            ? release.assets.find(asset => asset.name === `${apk.name}.sha256`)
            : null;
        if (!apk || !checksum || !this.isGitHubDownload(apk.browser_download_url) || !this.isGitHubDownload(checksum.browser_download_url))
            return null;

        const notes = release.body?.trim() ?? '';
        const versionCodeMatch = /^\s*- versionCode:\s*(\d+)\s*$/m.exec(notes);
        return {
            version: versionMatch[1],
            versionCode: versionCodeMatch ? Number(versionCodeMatch[1]) : null,
            url: apk.browser_download_url,
            checksumUrl: checksum.browser_download_url,
            notes
        };
    }

    private compareVersions(left: string, right: AppInfo['version']): number {
        const leftParts = this.versionParts(left);
        const rightParts = this.versionParts(right);
        if (!leftParts || !rightParts)
            return 0;
        for (let index = 0; index < leftParts.length; index++) {
            const difference = leftParts[index] - rightParts[index];
            if (difference !== 0)
                return difference;
        }
        return 0;
    }

    private versionParts(value: string): [number, number, number] | null {
        const match = /^(\d+)\.(\d+)\.(\d+)(?:-qa)?$/.exec(value);
        return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    }

    private isGitHubDownload(value: string): boolean {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && url.hostname === 'github.com';
        } catch {
            return false;
        }
    }
}
