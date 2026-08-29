import { of, throwError } from 'rxjs';
import { AndroidReleaseUpdateService } from './android-release-update.service';

describe('AndroidReleaseUpdateService', () => {
    const release = {
        tag_name: 'android-v1.2.0',
        html_url: 'https://github.com/yosi90/libros-front/releases/tag/android-v1.2.0',
        body: 'Cambios\n\n- versionCode: 12',
        draft: false,
        prerelease: false,
        assets: [
            { name: 'memoria-bibliografica-1.2.0.apk', browser_download_url: 'https://github.com/yosi90/libros-front/releases/download/android-v1.2.0/memoria-bibliografica-1.2.0.apk' },
            { name: 'memoria-bibliografica-1.2.0.apk.sha256', browser_download_url: 'https://github.com/yosi90/libros-front/releases/download/android-v1.2.0/memoria-bibliografica-1.2.0.apk.sha256' }
        ]
    };

    it('avisa una sola vez de una release productiva posterior y abre su APK', async () => {
        const http = { get: jasmine.createSpy().and.returnValue(of(release)) };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem']);
        const external = jasmine.createSpyObj('ExternalNavigationService', ['open']);
        const app = { getInfo: jasmine.createSpy().and.resolveTo({ id: 'es.yosiftware.libros', version: '1.1.0' }) };
        const service = new AndroidReleaseUpdateService(http as never, toasts, external, app as never, true);

        await service.check();
        await service.check();

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(toasts.showSystem).toHaveBeenCalledTimes(1);
        const options = toasts.showSystem.calls.mostRecent().args[1];
        await options.action.execute();
        expect(external.open).toHaveBeenCalledOnceWith(release.assets[0].browser_download_url);
    });

    it('no consulta releases desde QA ni desde la web', async () => {
        const http = { get: jasmine.createSpy() };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem']);
        const external = jasmine.createSpyObj('ExternalNavigationService', ['open']);

        const qa = new AndroidReleaseUpdateService(http as never, toasts, external, { getInfo: async () => ({ id: 'es.yosiftware.libros.qa' }) } as never, true);
        const web = new AndroidReleaseUpdateService(http as never, toasts, external, {} as never, false);
        await qa.check();
        await web.check();

        expect(http.get).not.toHaveBeenCalled();
        expect(toasts.showSystem).not.toHaveBeenCalled();
    });

    it('ignora errores, prereleases y artefactos sin checksum', async () => {
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem']);
        const external = jasmine.createSpyObj('ExternalNavigationService', ['open']);
        const app = { getInfo: async () => ({ id: 'es.yosiftware.libros', version: '1.0.0' }) };
        const failing = new AndroidReleaseUpdateService({ get: () => throwError(() => new Error('offline')) } as never, toasts, external, app as never, true);
        const incomplete = new AndroidReleaseUpdateService({ get: () => of({ ...release, assets: release.assets.slice(0, 1) }) } as never, toasts, external, app as never, true);

        await failing.check();
        await incomplete.check();

        expect(toasts.showSystem).not.toHaveBeenCalled();
    });
});
