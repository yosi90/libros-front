import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('las rutas internas publicadas son canonicas', async () => {
    const files = await sourceFiles(path.join(root, 'src', 'app'));
    const forbiddenRoutes = /["'`]\/?(?:dashboard\/)?(?:addAuthor|addUniverse|addSaga|addAntology|addBook|updateAuthor|updateUniverse|updateSaga|updateAntology|updateBook)(?:\/|["'`?#])|["'`]\/?dashboard\/chat(?:\/|["'`?#])/;
    const offenders = [];

    for (const file of files) {
        if (file.endsWith('.spec.ts')) continue;
        const source = await readFile(file, 'utf8');
        if (forbiddenRoutes.test(source)) offenders.push(path.relative(root, file));
    }

    assert.deepEqual(offenders, [], `Consumidores de rutas heredadas: ${offenders.join(', ')}`);
});

test('ningun token de autenticacion se persiste en Web Storage', async () => {
    const files = await sourceFiles(path.join(root, 'src', 'app'));
    const offenders = [];

    for (const file of files) {
        if (file.endsWith('.spec.ts')) continue;
        const source = await readFile(file, 'utf8');
        const calls = source.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*(["'`])([^"'`]+)\1/g);
        for (const match of calls) {
            if (/(?:^|[-_:])(jwt|access[-_]?token|id[-_]?token|custom[-_]?token|refresh)(?:$|[-_:])/i.test(match[2]))
                offenders.push(`${path.relative(root, file)}:${match[2]}`);
        }
    }

    assert.deepEqual(offenders, [], `Tokens persistidos: ${offenders.join(', ')}`);
});

test('la PWA no cachea API privada y convive con Firebase Messaging', async () => {
    const ngsw = JSON.parse(await readFile(path.join(root, 'ngsw-config.json'), 'utf8'));
    const angular = JSON.parse(await readFile(path.join(root, 'angular.json'), 'utf8'));
    const build = angular.projects['book-front'].architect.build.options;
    const assetGlobs = build.assets.map(asset => typeof asset === 'string' ? asset : asset.glob);

    assert.equal(ngsw.dataGroups, undefined, 'No debe existir cache de respuestas de API.');
    assert.ok(ngsw.navigationUrls.includes('!/__/auth/**'), 'El handler OAuth debe quedar fuera del fallback SPA.');
    assert.ok(ngsw.navigationUrls.includes('!/firebase-cloud-messaging-push-scope/**'), 'El scope de Messaging debe quedar fuera del fallback SPA.');
    assert.equal(angular.projects['book-front'].architect.build.configurations.production.serviceWorker, 'ngsw-config.json');
    assert.equal(angular.projects['book-front'].architect.build.configurations.qa.serviceWorker, 'ngsw-config.json');
    assert.ok(assetGlobs.includes('firebase-messaging-sw.js'), 'El worker de Firebase Messaging debe copiarse al artefacto.');
});

test('Mobile se activa en QA y produccion, limita su apariencia a light/dark y no altera Wood', async () => {
    const [qaEnvironment, productionEnvironment, mobileTheme, presentationMode, globalStyles] = await Promise.all([
        readFile(path.join(root, 'src', 'environment', 'environment.qa.ts'), 'utf8'),
        readFile(path.join(root, 'src', 'environment', 'environment.ts'), 'utf8'),
        readFile(path.join(root, 'src', 'app', 'services', 'ui', 'mobile-theme.service.ts'), 'utf8'),
        readFile(path.join(root, 'src', 'app', 'services', 'ui', 'presentation-mode.service.ts'), 'utf8'),
        readFile(path.join(root, 'src', 'styles.sass'), 'utf8')
    ]);
    const files = await sourceFiles(path.join(root, 'src', 'app'));
    const forbiddenPresentationConsumers = [];

    for (const file of files) {
        if (file.endsWith('.spec.ts') || file.endsWith(path.join('interfaces', 'auth.ts'))) continue;
        const source = await readFile(file, 'utf8');
        if (/data-theme|book-front:theme|InterfacePreferencesService|app-theme-switcher/.test(source))
            forbiddenPresentationConsumers.push(path.relative(root, file));
    }

    assert.match(qaEnvironment, /mobilePresentationEnabled:\s*true/);
    assert.match(productionEnvironment, /mobilePresentationEnabled:\s*true/);
    assert.deepEqual(forbiddenPresentationConsumers, [], `Consumidores de temas retirados: ${forbiddenPresentationConsumers.join(', ')}`);
    assert.match(mobileTheme, /export type MobileTheme = 'light' \| 'dark'/);
    assert.match(mobileTheme, /theme === 'dark' \? 'dark' : 'light'/, 'Wood historico debe degradar a light en Mobile.');
    assert.match(globalStyles, /data-mobile-theme='dark'.*data-presentation-active='mobile'/);
    assert.match(globalStyles, /data-mobile-theme='dark'.*data-presentation-active='native-mobile'/);
    assert.doesNotMatch(globalStyles, /data-mobile-theme=.*data-presentation-active='wood'/);
    assert.doesNotMatch(presentationMode, /MobileTheme|mobileTheme|InterfaceTheme/, 'La apariencia no debe decidir la presentacion Wood/Mobile.');
});

test('Bootstrap permanece confinado a los dos puntos legacy declarados', async () => {
    const files = [
        ...(await sourceFiles(path.join(root, 'src'))),
        path.join(root, 'angular.json')
    ];
    const consumers = [];

    for (const file of files) {
        const source = await readFile(file, 'utf8');
        if (/bootstrap/i.test(source)) consumers.push(path.relative(root, file).replaceAll('\\', '/'));
    }

    assert.deepEqual(consumers.sort(), ['src/main.ts', 'src/styles.sass']);
});

test('Android separa flavors, Firebase y capacidades nativas sin debilitar el artefacto', async () => {
    const [packageJson, manifest, qaManifest, productionManifest, gradle, androidIgnore, capacitor, index, stampScript, releaseWorkflow, updateService, angular, qaAppLinks, productionAppLinks] = await Promise.all([
        readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
        readFile(path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8'),
        readFile(path.join(root, 'android', 'app', 'src', 'qa', 'AndroidManifest.xml'), 'utf8'),
        readFile(path.join(root, 'android', 'app', 'src', 'production', 'AndroidManifest.xml'), 'utf8'),
        readFile(path.join(root, 'android', 'app', 'build.gradle'), 'utf8'),
        readFile(path.join(root, 'android', '.gitignore'), 'utf8'),
        readFile(path.join(root, 'capacitor.config.ts'), 'utf8'),
        readFile(path.join(root, 'src', 'index.html'), 'utf8'),
        readFile(path.join(root, 'scripts', 'android', 'stamp-native-build.mjs'), 'utf8'),
        readFile(path.join(root, '.github', 'workflows', 'android-release-manual.yml'), 'utf8'),
        readFile(path.join(root, 'src', 'app', 'services', 'native', 'android-release-update.service.ts'), 'utf8'),
        readFile(path.join(root, 'angular.json'), 'utf8').then(JSON.parse),
        readFile(path.join(root, 'src', 'hosting', 'qa', '.well-known', 'assetlinks.json'), 'utf8').then(JSON.parse),
        readFile(path.join(root, 'src', 'hosting', 'production', '.well-known', 'assetlinks.json'), 'utf8').then(JSON.parse)
    ]);

    assert.equal(packageJson.dependencies['@capacitor/network'], '^8.0.1');
    assert.equal(packageJson.dependencies['@capacitor/browser'], '^8.0.4');
    assert.match(manifest, /android:allowBackup="false"/);
    assert.match(manifest, /android:windowSoftInputMode="adjustResize"/);
    assert.match(gradle, /applicationIdSuffix "\.qa"/);
    assert.match(qaManifest, /android:host="qa-libros\.yosiftware\.es"/);
    assert.doesNotMatch(qaManifest, /android:host="libros\.yosiftware\.es"/);
    assert.match(productionManifest, /android:host="libros\.yosiftware\.es"/);
    assert.doesNotMatch(productionManifest, /qa-libros\.yosiftware\.es/);
    assert.match(androidIgnore, /google-services\.json/);
    assert.match(androidIgnore, /\*\.keystore/);
    assert.doesNotMatch(capacitor, /server:\s*\{[^}]*url:/s, 'La app no debe cargar un frontend remoto dentro del WebView.');
    assert.match(index, /viewport-fit=cover/);
    assert.match(index, /interactive-widget=resizes-content/);
    assert.match(packageJson.scripts['build:native:qa'], /stamp-native-build\.mjs qa/);
    assert.match(packageJson.scripts['build:native:production'], /stamp-native-build\.mjs production/);
    assert.match(gradle, /native-build-environment\.json/);
    assert.match(stampScript, /forbiddenApi/);
    assert.match(gradle, /ANDROID_KEYSTORE_PATH/);
    assert.match(gradle, /Una APK release exige/);
    assert.match(releaseWorkflow, /ANDROID_KEYSTORE_BASE64: \$\{\{ secrets\.ANDROID_KEYSTORE_BASE64 \}\}/);
    assert.match(releaseWorkflow, /ANDROID_GOOGLE_SERVICES_QA_BASE64/);
    assert.match(releaseWorkflow, /ANDROID_GOOGLE_SERVICES_PRODUCTION_BASE64/);
    assert.match(releaseWorkflow, /inputs\.publish_release && inputs\.flavor == 'production'/);
    assert.match(releaseWorkflow, /apksigner_path[\s\S]*verify/);
    assert.match(releaseWorkflow, /sha256sum/);
    assert.match(updateService, /appInfo\.id !== 'es\.yosiftware\.libros'/);
    assert.match(updateService, /api\.github\.com\/repos\/yosi90\/libros-front\/releases\/latest/);
    assert.match(updateService, /\.sha256/);
    assert.match(JSON.stringify(angular.projects['book-front'].architect.build.configurations.production.assets), /src\/hosting\/production\/\.well-known/);
    assert.equal(qaAppLinks[0].target.package_name, 'es.yosiftware.libros.qa');
    assert.deepEqual(qaAppLinks[0].target.sha256_cert_fingerprints, [
        '83:AD:BD:68:7E:8A:13:D1:FD:AE:27:6B:0E:78:8B:EF:FD:69:CD:BA:21:B9:3D:3F:A8:D4:3D:B6:99:4C:5E:75',
        '9F:B3:C6:FA:07:EB:B0:60:AF:71:E0:D0:77:96:DC:B4:FA:E9:9B:64:62:6C:8C:AD:0F:5F:56:3E:03:96:E5:41'
    ]);
    assert.equal(productionAppLinks[0].target.package_name, 'es.yosiftware.libros');
    assert.deepEqual(productionAppLinks[0].target.sha256_cert_fingerprints, ['9F:B3:C6:FA:07:EB:B0:60:AF:71:E0:D0:77:96:DC:B4:FA:E9:9B:64:62:6C:8C:AD:0F:5F:56:3E:03:96:E5:41']);
});

test('Hosting publica CSP y cabeceras defensivas sin bloquear popup OAuth', async () => {
    const firebase = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8'));
    const globalHeaders = firebase.hosting.headers.find(rule => rule.source === '**')?.headers ?? [];
    const headers = Object.fromEntries(globalHeaders.map(header => [header.key.toLowerCase(), header.value]));

    assert.match(headers['content-security-policy'], /object-src 'none'/);
    assert.match(headers['content-security-policy'], /frame-ancestors 'self'/);
    assert.match(headers['content-security-policy'], /frame-src 'self' https:/);
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.equal(headers['cross-origin-opener-policy'], 'same-origin-allow-popups');
    assert.equal(headers['x-frame-options'], 'SAMEORIGIN');
});

test('la campaña de integración evalúa el flag después de cargar el environment QA', async () => {
    const workflow = await readFile(path.join(root, '.github', 'workflows', 'qa-nightly.yml'), 'utf8');
    const manualWorkflow = await readFile(path.join(root, '.github', 'workflows', 'qa-hosting-manual.yml'), 'utf8');

    assert.match(workflow, /integration:\s*\n\s*if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}/);
    assert.doesNotMatch(workflow, /integration:\s*\n\s*if:.*QA_HOSTING_DEPLOY_ENABLED/);
    assert.match(workflow, /QA_HOSTING_DEPLOY_ENABLED: \$\{\{ vars\.QA_HOSTING_DEPLOY_ENABLED \}\}/);
    assert.match(workflow, /if \[ "\$QA_HOSTING_DEPLOY_ENABLED" != "true" \]/);
    assert.match(manualWorkflow, /npm audit --audit-level=low/);
    assert.match(manualWorkflow, /--fetch-timeout=60000/);
    assert.match(manualWorkflow, /for attempt in 1 2 3/);
    assert.match(manualWorkflow, /audit endpoint returned an error\|network timeout/);
    assert.match(manualWorkflow, /resolved_qs=.*node -p/);
    assert.match(manualWorkflow, /continúa QA con qs@\$resolved_qs verificado/);
});

async function sourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await sourceFiles(target));
        else if (/\.(?:html|sass|scss|ts)$/.test(entry.name)) files.push(target);
    }
    return files;
}
