import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
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
        const legacyRoute = [...source.matchAll(new RegExp(forbiddenRoutes, 'g'))].some(match =>
            !/\bparams\.get\($/.test(source.slice(Math.max(0, match.index - 20), match.index)));
        if (legacyRoute) offenders.push(path.relative(root, file));
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

test('los estilos no usan tokens MDC retirados por Angular Material', async () => {
    // Material 19+ ignora --mdc-*: esas reglas dejan pasar la paleta por defecto sin error visible.
    const files = await sourceFiles(path.join(root, 'src'));
    const offenders = [];

    for (const file of files) {
        if (!/\.(?:sass|scss)$/.test(file)) continue;
        const source = await readFile(file, 'utf8');
        if (/--mdc-[a-z]/.test(source)) offenders.push(path.relative(root, file));
    }

    assert.deepEqual(offenders, [], `Tokens --mdc-* sin efecto: ${offenders.join(', ')}`);
});

test('la PWA no cachea API privada ni copia el worker de Firebase Messaging', async () => {
    const ngsw = JSON.parse(await readFile(path.join(root, 'ngsw-config.json'), 'utf8'));
    const angular = JSON.parse(await readFile(path.join(root, 'angular.json'), 'utf8'));
    const configurations = angular.projects['book-front'].architect.build.configurations;
    const assetGlobs = [angular.projects['book-front'].architect.build.options, configurations.production, configurations.qa]
        .flatMap(config => config.assets ?? [])
        .map(asset => typeof asset === 'string' ? asset : asset.glob);

    assert.equal(ngsw.dataGroups, undefined, 'No debe existir cache de respuestas de API.');
    assert.equal(configurations.production.serviceWorker, 'ngsw-config.json');
    assert.equal(configurations.qa.serviceWorker, 'ngsw-config.json');
    // El push es el de la plataforma (hito 3 de la adhesión): Libros ya no registra su propio worker de Messaging.
    assert.ok(!assetGlobs.includes('firebase-messaging-sw.js'), 'El worker de Firebase Messaging ya no se publica.');
    assert.ok(!ngsw.navigationUrls.includes('!/firebase-cloud-messaging-push-scope/**'));
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
    assert.doesNotMatch(globalStyles, /native-mobile/, 'La presentación de Capacitor se retiró en el corte.');
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

test('la web ya no lleva la APK de Capacitor y conserva los App Links de la APK Kotlin', async () => {
    // La APK de Capacitor quedó sin soporte en el corte (etiqueta `apk-capacitor-final`); la nueva vive en `android-nativa/`.
    const [packageJson, index, angular, qaAppLinks, productionAppLinks] = await Promise.all([
        readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
        readFile(path.join(root, 'src', 'index.html'), 'utf8'),
        readFile(path.join(root, 'angular.json'), 'utf8').then(JSON.parse),
        readFile(path.join(root, 'src', 'hosting', 'qa', '.well-known', 'assetlinks.json'), 'utf8').then(JSON.parse),
        readFile(path.join(root, 'src', 'hosting', 'production', '.well-known', 'assetlinks.json'), 'utf8').then(JSON.parse)
    ]);
    const dependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
    const missing = async target => access(path.join(root, ...target)).then(() => false, () => true);

    assert.deepEqual(dependencies.filter(name => /^@capacitor(?:-firebase)?\//.test(name) || name === 'firebase'), []);
    assert.deepEqual(Object.keys(packageJson.scripts).filter(name => /native|android/.test(name)), []);
    for (const target of [['android'], ['capacitor.config.ts'], ['src', 'app', 'services', 'native'], ['src', 'firebase-messaging-sw.js'], ['.github', 'workflows', 'android-release-manual.yml']])
        assert.ok(await missing(target), `${target.join('/')} se retiró con Capacitor.`);
    assert.match(index, /viewport-fit=cover/);
    assert.match(index, /interactive-widget=resizes-content/);
    assert.doesNotMatch(index, /Capacitor/);
    assert.match(JSON.stringify(angular.projects['book-front'].architect.build.configurations.production.assets), /src\/hosting\/production\/\.well-known/);
    // Los App Links son los del paquete de siempre: la APK Kotlin se instala encima con la misma firma.
    assert.equal(qaAppLinks[0].target.package_name, 'es.yosiftware.libros.qa');
    assert.deepEqual(qaAppLinks[0].target.sha256_cert_fingerprints, [
        '83:AD:BD:68:7E:8A:13:D1:FD:AE:27:6B:0E:78:8B:EF:FD:69:CD:BA:21:B9:3D:3F:A8:D4:3D:B6:99:4C:5E:75',
        '9F:B3:C6:FA:07:EB:B0:60:AF:71:E0:D0:77:96:DC:B4:FA:E9:9B:64:62:6C:8C:AD:0F:5F:56:3E:03:96:E5:41'
    ]);
    assert.equal(productionAppLinks[0].target.package_name, 'es.yosiftware.libros');
    assert.deepEqual(productionAppLinks[0].target.sha256_cert_fingerprints, ['9F:B3:C6:FA:07:EB:B0:60:AF:71:E0:D0:77:96:DC:B4:FA:E9:9B:64:62:6C:8C:AD:0F:5F:56:3E:03:96:E5:41']);
});

test('Hosting publica la CSP del kit de Yosiftware y cabeceras defensivas sin bloquear la ventana de Google', async () => {
    const firebase = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8'));
    const globalHeaders = firebase.hosting.headers.find(rule => rule.source === '**')?.headers ?? [];
    const headers = Object.fromEntries(globalHeaders.map(header => [header.key.toLowerCase(), header.value]));
    const csp = headers['content-security-policy'];

    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'self'/);
    // ecosistema-kit/ACCESO.md, «Cabeceras de la web»: SDK, API y tiempo real de la plataforma, el acceso y los avatares.
    assert.match(csp, /script-src [^;]*https:\/\/cuentas\.yosiftware\.es/);
    assert.match(csp, /connect-src [^;]*https:\/\/cuentas-api\.yosiftware\.es [^;]*wss:\/\/cuentas-ws\.yosiftware\.es/);
    assert.match(csp, /frame-src https:\/\/cuentas\.yosiftware\.es;/);
    assert.match(csp, /img-src [^;]*https:\/\/cuentas-api\.yosiftware\.es/);
    // El título divertido de cada libro (iframe `sandbox` con `srcdoc`, que hereda esta CSP): sus fuentes y estilos de
    // Google Fonts y de los tres CDN que deja el servidor. Nada de esos CDN en `script-src`.
    for (const cdn of [String.raw`cdnjs\.cloudflare\.com`, String.raw`unpkg\.com`, String.raw`cdn\.jsdelivr\.net`]) {
        assert.match(csp, new RegExp(`style-src [^;]*https://${cdn}`));
        assert.match(csp, new RegExp(`font-src [^;]*https://${cdn}`));
        assert.doesNotMatch(csp, new RegExp(`script-src [^;]*${cdn}`));
    }
    assert.equal(headers['cross-origin-embedder-policy'], undefined);
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

test('los iconos escritos en plantillas existen en la fuente Material Icons', async () => {
    // Un nombre que la fuente no conoce se pinta como texto y puede desbordar su contenedor.
    const codepoints = await readFile(path.join(root, 'node_modules', 'material-icons', 'css', '_codepoints.scss'), 'utf8');
    const known = new Set([...codepoints.matchAll(/"([a-z0-9_]+)"\s*:/g)].map(match => match[1]));
    const files = await sourceFiles(path.join(root, 'src', 'app'));
    const offenders = [];

    for (const file of files) {
        if (!file.endsWith('.html')) continue;
        const source = await readFile(file, 'utf8');
        for (const match of source.matchAll(/<mat-icon[^>]*>([\s\S]*?)<\/mat-icon>/g)) {
            const content = match[1].trim();
            // Nombre literal, o literales devueltos por un ternario: {{cond ? 'a' : 'b'}}.
            const names = /^[a-z0-9_]+$/.test(content)
                ? [content]
                : [...content.matchAll(/\?\s*'([a-z0-9_]+)'\s*:\s*'([a-z0-9_]+)'/g)].flatMap(ternary => [ternary[1], ternary[2]]);
            for (const name of names)
                if (!known.has(name)) offenders.push(`${path.relative(root, file)}: ${name}`);
        }
    }

    assert.deepEqual(offenders, [], `Iconos inexistentes: ${offenders.join(', ')}`);
});

test('las vistas Web no usan clases que Bootstrap define de forma global', async () => {
    // Bootstrap se carga globalmente: `.row` añade márgenes negativos y `.progress` fija altura y oculta el contenido.
    const reserved = new Set(['row', 'col', 'container', 'progress', 'card', 'badge', 'btn', 'table', 'nav', 'navbar', 'alert', 'modal', 'toast',
        'collapse', 'dropdown', 'pagination', 'breadcrumb', 'spinner-border', 'tooltip', 'popover', 'list-group', 'form-control', 'form-select',
        'form-check', 'input-group', 'fade', 'show', 'active', 'close']);
    const files = await sourceFiles(path.join(root, 'src', 'app', 'components', 'web'));
    const offenders = [];

    for (const file of files) {
        if (!file.endsWith('.html')) continue;
        const source = await readFile(file, 'utf8');
        for (const match of source.matchAll(/\bclass="([^"]+)"/g))
            for (const name of match[1].split(/\s+/))
                if (reserved.has(name)) offenders.push(`${path.relative(root, file)}: ${name}`);
    }

    assert.deepEqual(offenders, [], `Clases reservadas por Bootstrap: ${offenders.join(', ')}`);
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

test('los iconos de las vistas Web y Mobile usan tamaños múltiplos de 4 px', async () => {
    // Con escalado de pantalla del 125 % (habitual en Windows), 18 px son 22,5 píxeles
    // físicos: Firefox ajusta el glifo a la rejilla y lo recorta arriba y abajo.
    const files = [
        ...await sourceFiles(path.join(root, 'src', 'app', 'components', 'web')),
        ...await sourceFiles(path.join(root, 'src', 'assets', 'css', 'web')),
        ...await sourceFiles(path.join(root, 'src', 'app', 'components', 'mobile')),
        ...await sourceFiles(path.join(root, 'src', 'assets', 'css', 'mobile'))
    ];
    const offenders = [];

    for (const file of files) {
        if (!file.endsWith('.sass')) continue;
        const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
        lines.forEach((line, index) => {
            if (!/mat-icon\s*$/.test(line.trim()) || line.trim().startsWith('//')) return;
            const indent = line.length - line.trimStart().length;
            for (const next of lines.slice(index + 1)) {
                if (!next.trim()) continue;
                if (next.length - next.trimStart().length <= indent) break;
                const match = next.match(/^\s*font-size:\s*(\d+)px\s*$/);
                if (match && Number(match[1]) % 4 !== 0)
                    offenders.push(`${path.relative(root, file)}:${index + 1} (${match[1]}px)`);
            }
        });
    }

    assert.deepEqual(offenders, [], `Iconos con tamaño no múltiplo de 4: ${offenders.join(', ')}`);
});
