// Borra versiones antiguas de Firebase Hosting para liberar cuota de almacenamiento.
// Conserva siempre las versiones publicadas en cualquier canal (live y previews).
// Uso: GOOGLE_SERVICE_ACCOUNT='<json de la cuenta>' node scripts/hosting/cleanup-versions.mjs <projectId> [--apply]
import { createSign } from 'node:crypto';

const [projectId, flag] = process.argv.slice(2);
const apply = flag === '--apply';
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT ?? 'null');
if (!projectId || !credentials?.private_key) {
    console.error('Uso: GOOGLE_SERVICE_ACCOUNT=... node cleanup-versions.mjs <projectId> [--apply]');
    process.exit(1);
}

// Token OAuth firmando un JWT con la clave de la cuenta de servicio (sin la API IAM Credentials).
async function accessToken() {
    const now = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    })}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key, 'base64url');
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` })
    });
    if (!response.ok) throw new Error(`token: ${response.status} ${await response.text()}`);
    return (await response.json()).access_token;
}
const token = await accessToken();
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
