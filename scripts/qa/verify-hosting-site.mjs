import { readFile } from 'node:fs/promises';

const [resultPath] = process.argv.slice(2);
if (!resultPath) throw new Error('Falta el resultado JSON de Firebase CLI.');

const projectId = process.env.QA_FIREBASE_PROJECT_ID?.trim();
const siteId = process.env.QA_FIREBASE_SITE_ID?.trim();
if (projectId !== 'libros-qa' || siteId !== 'libros-qa')
    throw new Error('Proyecto o sitio Hosting no coincide con el destino QA autorizado.');

const payload = JSON.parse(await readFile(resultPath, 'utf8'));
const sites = payload?.result?.sites;
if (payload?.status !== 'success' || !Array.isArray(sites))
    throw new Error('Firebase CLI no devolvió una lista de sitios válida.');

const expectedName = `projects/${projectId}/sites/${siteId}`;
if (!sites.some(site => site?.name === expectedName))
    throw new Error(`El sitio Hosting ${siteId} no está disponible mediante WIF.`);

console.log(`Acceso de lectura verificado para el sitio Hosting ${siteId}; no se ha desplegado contenido.`);
