// Borra versiones antiguas de Firebase Hosting para liberar cuota de almacenamiento.
// Conserva siempre las versiones publicadas en cualquier canal (live y previews).
// Uso: HOSTING_TOKEN=<token OAuth> node scripts/hosting/cleanup-versions.mjs <projectId> [--apply]

const [projectId, flag] = process.argv.slice(2);
const apply = flag === '--apply';
const token = process.env.HOSTING_TOKEN;
if (!projectId || !token) {
    console.error('Uso: HOSTING_TOKEN=... node cleanup-versions.mjs <projectId> [--apply]');
    process.exit(1);
}
const api = 'https://firebasehosting.googleapis.com/v1beta1/';

async function call(path, method = 'GET') {
    const response = await fetch(api + path, { method, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
    return response.status === 204 ? {} : response.json();
}

async function all(path, key) {
    const items = [];
    let pageToken = '';
    do {
        const page = await call(`${path}${path.includes('?') ? '&' : '?'}pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`);
        items.push(...(page[key] ?? []));
        pageToken = page.nextPageToken ?? '';
    } while (pageToken);
    return items;
}

const sites = await all(`projects/${projectId}/sites`, 'sites');
let deleted = 0;
for (const site of sites) {
    const siteId = site.name.split('/').pop();
    const channels = await all(`sites/${siteId}/channels`, 'channels');
    const inUse = new Set(channels.map(channel => channel.release?.version?.name).filter(Boolean));
    const versions = await all(`sites/${siteId}/versions`, 'versions');
    const removable = versions.filter(version => !inUse.has(version.name) && ['FINALIZED', 'ABANDONED', 'EXPIRED'].includes(version.status));
    const bytes = removable.reduce((total, version) => total + Number(version.versionBytes ?? 0), 0);
    console.log(`${siteId}: ${versions.length} versiones, ${inUse.size} en uso, ${removable.length} borrables (${(bytes / 1048576).toFixed(1)} MB)`);
    if (!apply) continue;
    for (const version of removable) {
        await call(version.name, 'DELETE');
        deleted++;
    }
}
console.log(apply ? `Borradas ${deleted} versiones.` : 'Simulacro: no se ha borrado nada.');
